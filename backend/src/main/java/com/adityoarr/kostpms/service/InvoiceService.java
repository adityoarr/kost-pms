package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.InvoiceDetailResponse;
import com.adityoarr.kostpms.dto.InvoiceResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class InvoiceService {

    private final JdbcTemplate jdbc;
    private final PaymentService paymentService;
    private final int dueDay;
    private final long lateFeePercent;

    public InvoiceService(JdbcTemplate jdbc,
                          PaymentService paymentService,
                          @Value("${app.billing.due-day:5}") int dueDay,
                          @Value("${app.billing.late-fee-percent:5}") long lateFeePercent) {
        this.jdbc = jdbc;
        this.paymentService = paymentService;
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
            "JOIN properties p ON u.property_id = p.id ";

    private final RowMapper<InvoiceResponse> invoiceMapper = new RowMapper<InvoiceResponse>() {
        @Override
        public InvoiceResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
            UUID id = UUID.fromString(rs.getString("id"));
            long paidNet = paymentService.sumPaid(id);
            long base = rs.getLong("base_amount");
            long discount = rs.getLong("discount");
            int rate = rs.getInt("late_fee_rate_percent");
            LocalDate due = rs.getObject("due_date", LocalDate.class);
            String stored = rs.getString("status");
            String eff = effectiveStatus(stored, due);
            long net = base - discount;
            long remaining = Math.max(0L, net - paidNet);
            long lateFee = "OVERDUE".equals(eff) ? Math.round(remaining * rate / 100.0) : 0L;
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
                    base, discount, rate,
                    stored, eff,
                    paidNet, remaining, lateFee, remaining + lateFee,
                    rs.getString("void_reason"),
                    rs.getString("created_by_username"),
                    rs.getObject("created_at", OffsetDateTime.class)
            );
        }
    };

    // ---- generate tagihan untuk satu periode bulan (idempoten via unique lease+period) ----
    public Map<String, Object> generate(YearMonth period, String username) {
        LocalDate start = period.atDay(1);
        LocalDate end = period.atEndOfMonth();
        LocalDate due = period.atDay(Math.min(dueDay, period.lengthOfMonth()));

        List<Map<String, Object>> leases = jdbc.queryForList(
                "SELECT l.id, l.monthly_rate FROM leases l " +
                "WHERE l.status = 'ACTIVE' AND l.start_date <= ? AND (l.end_date IS NULL OR l.end_date >= ?)",
                end, start);

        int created = 0, skipped = 0;
        for (Map<String, Object> lease : leases) {
            Object leaseId = lease.get("id");
            Integer exists = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM invoices WHERE lease_id = ? AND period_start = ?",
                    Integer.class, leaseId, start);
            if (exists != null && exists > 0) { skipped++; continue; }
            jdbc.update(
                    "INSERT INTO invoices (id, lease_id, period_start, period_end, due_date, base_amount, discount, late_fee_rate_percent, status, created_by_username) " +
                    "VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'OPEN', ?)",
                    UUID.randomUUID(), leaseId, start, end, due,
                    ((Number) lease.get("monthly_rate")).longValue(), lateFeePercent, username);
            created++;
        }
        return Map.of("period", period.toString(), "created", created, "skipped", skipped);
    }

    public List<InvoiceResponse> findAll(String status, String leaseId) {
        StringBuilder sb = new StringBuilder(SELECT_JOIN);
        List<Object> params = new ArrayList<>();
        List<String> conds = new ArrayList<>();
        if (status != null && !status.isBlank()) { conds.add("i.status = ?"); params.add(status); }
        if (leaseId != null && !leaseId.isBlank()) { conds.add("i.lease_id = ?"); params.add(UUID.fromString(leaseId)); }
        if (!conds.isEmpty()) sb.append(" WHERE ").append(String.join(" AND ", conds));
        sb.append(" ORDER BY i.period_start DESC, i.created_at DESC");
        return jdbc.query(sb.toString(), invoiceMapper, params.toArray());
    }

    public InvoiceResponse findById(UUID id) {
        List<InvoiceResponse> rows = jdbc.query(SELECT_JOIN + "WHERE i.id = ?", invoiceMapper, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public InvoiceDetailResponse findDetail(UUID id) {
        InvoiceResponse inv = findById(id);
        if (inv == null) return null;
        return new InvoiceDetailResponse(inv, paymentService.listByInvoice(id));
    }

    public InvoiceResponse voidInvoice(UUID id, String reason) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT status FROM invoices WHERE id = ?", id);
        if (rows.isEmpty()) return null;
        if ("VOID".equals(rows.get(0).get("status")))
            throw new IllegalArgumentException("Tagihan sudah dibatalkan sebelumnya.");
        long paid = paymentService.sumPaid(id);
        if (paid != 0)
            throw new IllegalStateException("Tagihan memiliki pembayaran tercatat. Nol-kan dulu lewat adjustment sebelum dibatalkan.");
        jdbc.update("UPDATE invoices SET status = 'VOID', void_reason = ?, updated_at = now() WHERE id = ?", reason, id);
        return findById(id);
    }

    private String effectiveStatus(String stored, LocalDate due) {
        if (("OPEN".equals(stored) || "PARTIALLY_PAID".equals(stored)) && due.isBefore(LocalDate.now())) {
            return "OVERDUE";
        }
        return stored;
    }
}