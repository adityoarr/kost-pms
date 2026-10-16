package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.InvoiceDetailResponse;
import com.adityoarr.kostpms.dto.InvoiceResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InvoiceService {

    private final JdbcTemplate jdbc;
    private final PaymentService paymentService;
    private final OwnerContextService ownerContext;
    private final int dueDay;
    private final long lateFeePercent;

    public InvoiceService(JdbcTemplate jdbc,
                          PaymentService paymentService,
                          OwnerContextService ownerContext,
                          @Value("${app.billing.due-day:5}") int dueDay,
                          @Value("${app.billing.late-fee-percent:5}") long lateFeePercent) {
        this.jdbc = jdbc;
        this.paymentService = paymentService;
        this.ownerContext = ownerContext;
        this.dueDay = dueDay;
        this.lateFeePercent = lateFeePercent;
    }

    private static final String SELECT_JOIN =
            "SELECT i.id, i.lease_id, i.period_start, i.period_end, i.due_date, i.base_amount, i.discount, " +
            "       i.late_fee_rate_percent, i.status, i.void_reason, i.created_by_username, i.created_at, " +
            "       t.name AS tenant_name, t.phone AS tenant_phone, u.unit_number, p.name AS property_name " +
            "FROM invoices i " +
            "JOIN leases l ON i.lease_id = l.id " +
            "JOIN tenants t ON l.tenant_id = t.id " +
            "JOIN units u ON l.unit_id = u.id " +
            "JOIN properties p ON u.property_id = p.id " +
            "WHERE p.owner_id = ? ";

    private final RowMapper<InvoiceResponse> invoiceMapper = new RowMapper<InvoiceResponse>() {
        @Override
        public InvoiceResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            UUID id = UUID.fromString(rs.getString("id"));
            long base = rs.getLong("base_amount");
            long disc = rs.getLong("discount");
            int rate = rs.getInt("late_fee_rate_percent");
            LocalDate due = rs.getObject("due_date", LocalDate.class);
            String stored = rs.getString("status");
            PaymentService.Breakdown b;
            try { b = paymentService.breakdownOf(id); }
            catch (IllegalArgumentException voidOrMissing) { b = new PaymentService.Breakdown(0L, 0L, 0L, null); }
            String eff = effectiveStatus(stored, due);
            return new InvoiceResponse(
                    id.toString(),
                    rs.getString("lease_id"),
                    rs.getString("tenant_name"),
                    rs.getString("tenant_phone"),
                    rs.getString("unit_number"),
                    rs.getString("property_name"),
                    rs.getObject("period_start", LocalDate.class),
                    rs.getObject("period_end", LocalDate.class),
                    due,
                    base, disc, rate,
                    stored, eff,
                    b.paidTotal,
                    b.principalRemaining,
                    b.feeAmount,
                    b.totalDue,
                    rs.getString("void_reason"),
                    rs.getString("created_by_username"),
                    rs.getObject("created_at", OffsetDateTime.class)
            );
        }
    };

    // Jalur request (user login): owner diambil dari SecurityContext.
    public Map<String, Object> generate(YearMonth period, String username) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        return generateForOwner(period, username, ownerId);
    }

    // FIX A3: jalur parametrik (tanpa SecurityContext) untuk scheduler / backfill startup.
    // Transaksional + ON CONFLICT DO NOTHING agar aman dari race pada unique (lease_id, period_start).
    @Transactional
    public Map<String, Object> generateForOwner(YearMonth period, String username, UUID ownerId) {
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        LocalDate start = period.atDay(1);
        LocalDate end = period.atEndOfMonth();
        LocalDate due = period.atDay(Math.min(dueDay, period.lengthOfMonth()));
        // Scope: hanya generate untuk lease milik owner ini
        List<Map<String, Object>> leases = jdbc.queryForList(
                "SELECT l.id, l.monthly_rate FROM leases l " +
                "JOIN tenants t ON l.tenant_id = t.id " +
                "WHERE l.status = 'ACTIVE' AND l.start_date <= ? AND (l.end_date IS NULL OR l.end_date >= ?) AND t.owner_id = ?",
                end, start, ownerId);
        int created = 0, skipped = 0;
        for (Map<String, Object> lease : leases) {
            Object leaseId = lease.get("id");
            int inserted = jdbc.update(
                    "INSERT INTO invoices (id, lease_id, period_start, period_end, due_date, base_amount, discount, late_fee_rate_percent, status, created_by_username, owner_id) " +
                    "VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'OPEN', ?, ?) " +
                    "ON CONFLICT (lease_id, period_start) DO NOTHING",
                    UUID.randomUUID(), leaseId, start, end, due,
                    ((Number) lease.get("monthly_rate")).longValue(), lateFeePercent, username, ownerId);
            if (inserted > 0) created++; else skipped++;
        }
        return Map.of("period", period.toString(), "created", created, "skipped", skipped);
    }

    public List<InvoiceResponse> findAll(String status, String leaseId) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return List.of();
        StringBuilder sb = new StringBuilder(SELECT_JOIN);
        List<Object> params = new ArrayList<>();
        params.add(ownerId);
        List<String> conds = new ArrayList<>();
        if (status != null && !status.isBlank()) { conds.add("i.status = ?"); params.add(status); }
        if (leaseId != null && !leaseId.isBlank()) { conds.add("i.lease_id = ?"); params.add(UUID.fromString(leaseId)); }
        if (!conds.isEmpty()) sb.append(" AND ").append(String.join(" AND ", conds));
        sb.append(" ORDER BY i.period_start DESC, i.created_at DESC");
        return jdbc.query(sb.toString(), invoiceMapper, params.toArray());
    }

    public InvoiceResponse findById(UUID id) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return null;
        List<InvoiceResponse> rows = jdbc.query(SELECT_JOIN + "AND i.id = ?", invoiceMapper, ownerId, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public InvoiceDetailResponse findDetail(UUID id) {
        InvoiceResponse inv = findById(id);
        if (inv == null) return null;
        return new InvoiceDetailResponse(inv, paymentService.listByInvoice(id));
    }

    public InvoiceResponse voidInvoice(UUID id, String reason) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return null;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT i.status FROM invoices i JOIN leases l ON i.lease_id = l.id JOIN tenants t ON l.tenant_id = t.id WHERE i.id = ? AND t.owner_id = ?",
                id, ownerId);
        if (rows.isEmpty()) return null;
        if ("VOID".equals(rows.get(0).get("status")))
            throw new IllegalArgumentException("Tagihan sudah dibatalkan sebelumnya.");
        long paid = paymentService.sumPaid(id);
        if (paid != 0)
            throw new IllegalStateException("Tagihan memiliki pembayaran tercatat. Nol-kan dulu lewat adjustment sebelum dibatalkan.");
        jdbc.update("UPDATE invoices SET status = 'VOID', void_reason = ?, updated_at = now() WHERE id = ? AND owner_id = ?", reason, id, ownerId);
        return findById(id);
    }

    private String effectiveStatus(String stored, LocalDate due) {
        if (("OPEN".equals(stored) || "PARTIALLY_PAID".equals(stored)) && due != null && due.isBefore(LocalDate.now(ZoneId.of("Asia/Jakarta")))) {
            return "OVERDUE";
        }
        return stored;
    }
}