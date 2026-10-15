package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.AdjustmentRequest;
import com.adityoarr.kostpms.dto.PaymentRequest;
import com.adityoarr.kostpms.dto.PaymentResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Set<String> METHODS = Set.of("CASH", "TRANSFER", "OTHER");
    private static final ZoneId JAKARTA = ZoneId.of("Asia/Jakarta");

    private final JdbcTemplate jdbc;
    private final OwnerContextService ownerContext;

    public PaymentService(JdbcTemplate jdbc, OwnerContextService ownerContext) {
        this.jdbc = jdbc;
        this.ownerContext = ownerContext;
    }

    private final RowMapper<PaymentResponse> paymentMapper = (rs, n) -> new PaymentResponse(
            rs.getString("id"),
            rs.getString("invoice_id"),
            rs.getLong("amount"),
            rs.getString("method"),
            rs.getString("reference"),
            rs.getObject("paid_at", OffsetDateTime.class),
            rs.getBoolean("is_adjustment"),
            rs.getString("received_by_username"),
            rs.getObject("created_at", OffsetDateTime.class)
    );

    public long sumPaid(UUID invoiceId) {
        Long v = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount),0) FROM payments WHERE invoice_id = ?",
                Long.class, invoiceId);
        return v == null ? 0L : v;
    }

    public List<PaymentResponse> listByInvoice(UUID invoiceId) {
        return jdbc.query(
                "SELECT id, invoice_id, amount, method, reference, paid_at, is_adjustment, received_by_username, created_at " +
                "FROM payments WHERE invoice_id = ? ORDER BY created_at ASC",
                paymentMapper, invoiceId);
    }

    public static class Breakdown {
        public final long netPrincipal;
        public final long paidTotal;
        public final long principalPaid;
        public final long feePaid;
        public final long principalRemaining;
        public final long feeAmount;
        public final long totalDue;
        public Breakdown(long netPrincipal, long paidTotal, long feeRatePercent, LocalDate dueDate) {
            this.netPrincipal = netPrincipal;
            this.paidTotal = paidTotal;
            this.principalPaid = Math.min(Math.max(paidTotal, 0L), netPrincipal);
            this.feePaid = Math.max(0L, paidTotal - netPrincipal);
            this.principalRemaining = Math.max(0L, netPrincipal - paidTotal);
            boolean overdue = dueDate != null && dueDate.isBefore(LocalDate.now(JAKARTA));
            this.feeAmount = overdue ? Math.round(this.principalRemaining * feeRatePercent / 100.0) : 0L;
            this.totalDue = this.principalRemaining + this.feeAmount;
        }
    }

    public Breakdown breakdownOf(UUID invoiceId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT base_amount, discount, late_fee_rate_percent, due_date, status FROM invoices WHERE id = ?",
                invoiceId);
        if (rows.isEmpty()) throw new IllegalArgumentException("Tagihan tidak ditemukan.");
        Map<String, Object> inv = rows.get(0);
        if ("VOID".equals(inv.get("status"))) throw new IllegalArgumentException("Tagihan sudah dibatalkan.");
        long net = ((Number) inv.get("base_amount")).longValue() - ((Number) inv.get("discount")).longValue();
        int rate = ((Number) inv.get("late_fee_rate_percent")).intValue();
        LocalDate due = ((java.sql.Date) inv.get("due_date")).toLocalDate();
        return new Breakdown(net, sumPaid(invoiceId), rate, due);
    }

    // Helper: validasi invoice milik owner ini (via lease->tenant->owner)
    private boolean isInvoiceOwned(UUID invoiceId) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return false;
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM invoices i " +
                "JOIN leases l ON i.lease_id = l.id " +
                "JOIN tenants t ON l.tenant_id = t.id " +
                "WHERE i.id = ? AND t.owner_id = ?",
                Integer.class, invoiceId, ownerId);
        return count != null && count > 0;
    }

    public PaymentResponse recordPayment(UUID invoiceId, PaymentRequest req, String username) {
        if (!isInvoiceOwned(invoiceId))
            throw new IllegalArgumentException("Tagihan tidak ditemukan atau bukan milik Anda.");
        if (!METHODS.contains(req.method()))
            throw new IllegalArgumentException("Method pembayaran harus salah satu: CASH, TRANSFER, OTHER.");
        Breakdown b = breakdownOf(invoiceId);
        if (b.totalDue <= 0L) throw new IllegalArgumentException("Tagihan sudah lunas (pokok & denda), tidak perlu pembayaran lagi.");
        if (req.amount() > b.totalDue)
            throw new IllegalArgumentException("Jumlah melebihi total yang harus dibayar (Rp " + b.totalDue + ", termasuk denda Rp " + b.feeAmount + ").");

        UUID ownerId = ownerContext.getCurrentOwnerId();
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO payments (id, invoice_id, amount, method, reference, paid_at, is_adjustment, received_by_username, owner_id) " +
                "VALUES (?, ?, ?, ?, ?, ?, false, ?, ?)",
                id, invoiceId, req.amount(), req.method(), req.reference(), parsePaidAt(req.paidAt()), username, ownerId);
        recompute(invoiceId);
        return findPayment(id);
    }

    public PaymentResponse recordAdjustment(UUID invoiceId, AdjustmentRequest req, String username) {
        if (!isInvoiceOwned(invoiceId))
            throw new IllegalArgumentException("Tagihan tidak ditemukan atau bukan milik Anda.");
        breakdownOf(invoiceId);
        UUID ownerId = ownerContext.getCurrentOwnerId();
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO payments (id, invoice_id, amount, method, reference, paid_at, is_adjustment, received_by_username, owner_id) " +
                "VALUES (?, ?, ?, 'ADJUSTMENT', ?, now(), true, ?, ?)",
                id, invoiceId, req.amount(), req.reason(), username, ownerId);
        recompute(invoiceId);
        return findPayment(id);
    }

    public boolean deletePayment(UUID paymentId) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return false;
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT p.invoice_id FROM payments p " +
                "JOIN invoices i ON p.invoice_id = i.id " +
                "JOIN leases l ON i.lease_id = l.id " +
                "JOIN tenants t ON l.tenant_id = t.id " +
                "WHERE p.id = ? AND t.owner_id = ?",
                paymentId, ownerId);
        if (rows.isEmpty()) return false;
        UUID invoiceId = UUID.fromString(String.valueOf(rows.get(0).get("invoice_id")));
        jdbc.update("DELETE FROM payments WHERE id = ?", paymentId);
        recompute(invoiceId);
        return true;
    }

    private void recompute(UUID invoiceId) {
        Breakdown b = breakdownOf(invoiceId);
        String status;
        if (b.totalDue <= 0L) status = "PAID";
        else if (b.paidTotal > 0L) status = "PARTIALLY_PAID";
        else status = "OPEN";
        jdbc.update("UPDATE invoices SET status = ?, updated_at = now() WHERE id = ?", status, invoiceId);
    }

    private OffsetDateTime parsePaidAt(String iso) {
        if (iso == null || iso.isBlank()) return OffsetDateTime.now(JAKARTA);
        try { return OffsetDateTime.parse(iso); }
        catch (DateTimeParseException e) { throw new IllegalArgumentException("Format paidAt tidak valid. Gunakan ISO-8601 atau kosongkan."); }
    }

    private PaymentResponse findPayment(UUID id) {
        List<PaymentResponse> rows = jdbc.query(
                "SELECT id, invoice_id, amount, method, reference, paid_at, is_adjustment, received_by_username, created_at " +
                "FROM payments WHERE id = ?", paymentMapper, id);
        return rows.isEmpty() ? null : rows.get(0);
    }
}
