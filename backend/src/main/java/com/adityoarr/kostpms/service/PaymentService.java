package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.AdjustmentRequest;
import com.adityoarr.kostpms.dto.PaymentRequest;
import com.adityoarr.kostpms.dto.PaymentResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Set<String> METHODS = Set.of("CASH", "TRANSFER", "OTHER");

    private final JdbcTemplate jdbc;

    public PaymentService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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

    public PaymentResponse recordPayment(UUID invoiceId, PaymentRequest req, String username) {
        Map<String, Object> inv = invoiceRow(invoiceId);
        if (inv == null) throw new IllegalArgumentException("Tagihan tidak ditemukan.");
        if ("VOID".equals(inv.get("status")))
            throw new IllegalArgumentException("Tagihan sudah dibatalkan, tidak bisa menerima pembayaran.");
        if (!METHODS.contains(req.method()))
            throw new IllegalArgumentException("Method pembayaran harus salah satu: CASH, TRANSFER, OTHER.");

        long net = netOf(inv);
        long paid = sumPaid(invoiceId);
        if (paid >= net) throw new IllegalArgumentException("Tagihan sudah lunas, tidak perlu pembayaran lagi.");
        long remaining = net - paid;
        if (req.amount() > remaining)
            throw new IllegalArgumentException("Jumlah melebihi sisa tagihan (Rp " + remaining + ").");

        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO payments (id, invoice_id, amount, method, reference, paid_at, is_adjustment, received_by_username) " +
                "VALUES (?, ?, ?, ?, ?, ?, false, ?)",
                id, invoiceId, req.amount(), req.method(), req.reference(), parsePaidAt(req.paidAt()), username);
        recompute(invoiceId);
        return findPayment(id);
    }

    public PaymentResponse recordAdjustment(UUID invoiceId, AdjustmentRequest req, String username) {
        Map<String, Object> inv = invoiceRow(invoiceId);
        if (inv == null) throw new IllegalArgumentException("Tagihan tidak ditemukan.");
        if ("VOID".equals(inv.get("status")))
            throw new IllegalArgumentException("Tagihan sudah dibatalkan, tidak bisa menerima adjustment.");

        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO payments (id, invoice_id, amount, method, reference, paid_at, is_adjustment, received_by_username) " +
                "VALUES (?, ?, ?, 'ADJUSTMENT', ?, now(), true, ?)",
                id, invoiceId, req.amount(), req.reason(), username);
        recompute(invoiceId);
        return findPayment(id);
    }

    public boolean deletePayment(UUID paymentId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT invoice_id FROM payments WHERE id = ?", paymentId);
        if (rows.isEmpty()) return false;
        UUID invoiceId = UUID.fromString(String.valueOf(rows.get(0).get("invoice_id")));
        jdbc.update("DELETE FROM payments WHERE id = ?", paymentId);
        recompute(invoiceId);
        return true;
    }

    // ---- helpers ----
    private Map<String, Object> invoiceRow(UUID id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT status, base_amount, discount FROM invoices WHERE id = ?", id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private long netOf(Map<String, Object> inv) {
        return ((Number) inv.get("base_amount")).longValue()
                - ((Number) inv.get("discount")).longValue();
    }

    private void recompute(UUID invoiceId) {
        Map<String, Object> inv = invoiceRow(invoiceId);
        if (inv == null) return;
        long net = netOf(inv);
        long paid = sumPaid(invoiceId);
        String status = paid >= net ? "PAID" : (paid > 0 ? "PARTIALLY_PAID" : "OPEN");
        jdbc.update("UPDATE invoices SET status = ?, updated_at = now() WHERE id = ?", status, invoiceId);
    }

    private OffsetDateTime parsePaidAt(String iso) {
        if (iso == null || iso.isBlank()) return OffsetDateTime.now();
        try {
            return OffsetDateTime.parse(iso);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Format paidAt tidak valid. Gunakan ISO-8601 atau kosongkan.");
        }
    }

    private PaymentResponse findPayment(UUID id) {
        List<PaymentResponse> rows = jdbc.query(
                "SELECT id, invoice_id, amount, method, reference, paid_at, is_adjustment, received_by_username, created_at " +
                "FROM payments WHERE id = ?", paymentMapper, id);
        return rows.isEmpty() ? null : rows.get(0);
    }
}