package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.PaymentInfoRequest;
import com.adityoarr.kostpms.dto.PaymentInfoResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentInfoService {

    private final JdbcTemplate jdbc;

    public PaymentInfoService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Owner membaca info pembayaran satu properti (untuk pre-fill form).
    // Return null HANYA jika properti tidak ada; jika ada tapi belum diisi, field = null.
    public PaymentInfoResponse getForProperty(UUID propertyId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT name, payment_bank, payment_account_number, payment_account_holder, payment_notes " +
                "FROM properties WHERE id = ?", propertyId);
        if (rows.isEmpty()) return null;
        return toResponse(rows.get(0));
    }

    // Owner memperbarui info pembayaran. Return false jika properti tidak ada.
    public boolean updateForProperty(UUID propertyId, PaymentInfoRequest req) {
        int updated = jdbc.update(
                "UPDATE properties SET payment_bank=?, payment_account_number=?, payment_account_holder=?, payment_notes=?, updated_at=now() " +
                "WHERE id = ?",
                blankToNull(req.bank()), blankToNull(req.accountNumber()),
                blankToNull(req.accountHolder()), blankToNull(req.notes()), propertyId);
        return updated > 0;
    }

    // Tenant membaca info pembayaran dari properti kontrak AKTIF-nya.
    // Selalu return objek (field null jika belum ada kontrak / belum diisi) agar frontend sederhana.
    public PaymentInfoResponse getForTenant(UUID tenantId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT p.name, p.payment_bank, p.payment_account_number, p.payment_account_holder, p.payment_notes " +
                "FROM leases l " +
                "JOIN units u ON l.unit_id = u.id " +
                "JOIN properties p ON u.property_id = p.id " +
                "WHERE l.tenant_id = ? AND l.status = 'ACTIVE' " +
                "ORDER BY l.created_at DESC LIMIT 1", tenantId);
        if (rows.isEmpty()) {
            return new PaymentInfoResponse(null, null, null, null, null);
        }
        return toResponse(rows.get(0));
    }

    private PaymentInfoResponse toResponse(Map<String, Object> r) {
        return new PaymentInfoResponse(
                (String) r.get("name"),
                (String) r.get("payment_bank"),
                (String) r.get("payment_account_number"),
                (String) r.get("payment_account_holder"),
                (String) r.get("payment_notes"));
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
