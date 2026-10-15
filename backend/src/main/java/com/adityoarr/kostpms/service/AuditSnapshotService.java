package com.adityoarr.kostpms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuditSnapshotService {

    private final JdbcTemplate jdbc;
    private final PaymentService paymentService;
    private final ObjectMapper om = new ObjectMapper();

    public AuditSnapshotService(JdbcTemplate jdbc, PaymentService paymentService) {
        this.jdbc = jdbc;
        this.paymentService = paymentService;
    }

    // Snapshot per jenis entitas. Return JSON string atau null.
    public String snapshot(String entityType, String entityId) {
        if (entityType == null || entityId == null) return null;
        try {
            UUID id = UUID.fromString(entityId);
            Map<String, Object> m;
            switch (entityType) {
                case "INVOICE": m = invoiceMap(id); break;
                case "PAYMENT": m = paymentWrapMap(id); break;
                case "USER":    m = userMap(id); break;
                case "TENANT":  m = tenantMap(id); break;
                case "LEASE":   m = leaseMap(id); break;
                default: return null;
            }
            return m == null ? null : om.writeValueAsString(m);
        } catch (Exception e) {
            return null; // snapshot gagal jangan sampai menggagalkan aksi utama
        }
    }

    // Memakai breakdownOf -> SATU sumber kebenaran rumus denda (tidak ada rumus kedua).
    private Map<String, Object> invoiceMap(UUID id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT status FROM invoices WHERE id = ?", id);
        if (rows.isEmpty()) return null;
        String status = (String) rows.get(0).get("status");
        if ("VOID".equals(status)) return Map.of("status", "VOID");
        PaymentService.Breakdown b = paymentService.breakdownOf(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", status);
        m.put("paidAmount", b.paidTotal);
        m.put("principalRemaining", b.principalRemaining);
        m.put("feeAmount", b.feeAmount);
        m.put("totalDue", b.totalDue);
        return m;
    }

    private Map<String, Object> paymentWrapMap(UUID paymentId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT amount, method, reference, is_adjustment, invoice_id FROM payments WHERE id = ?", paymentId);
        if (rows.isEmpty()) return null;
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("amount", ((Number) rows.get(0).get("amount")).longValue());
        p.put("method", rows.get(0).get("method"));
        p.put("reference", rows.get(0).get("reference"));
        p.put("isAdjustment", rows.get(0).get("is_adjustment"));
        Map<String, Object> wrap = new LinkedHashMap<>();
        wrap.put("payment", p);
        Object invId = rows.get(0).get("invoice_id");
        wrap.put("invoice", invId == null ? null : invoiceMap(UUID.fromString(String.valueOf(invId))));
        return wrap;
    }

    private Map<String, Object> userMap(UUID id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT full_name, role, status FROM users WHERE id = ?", id);
        if (rows.isEmpty()) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fullName", rows.get(0).get("full_name"));
        m.put("role", rows.get(0).get("role"));
        m.put("status", rows.get(0).get("status"));
        return m;
    }

    private Map<String, Object> tenantMap(UUID id) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT name, phone, status FROM tenants WHERE id = ?", id);
        if (rows.isEmpty()) return null;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", rows.get(0).get("name"));
        m.put("phone", rows.get(0).get("phone"));
        m.put("status", rows.get(0).get("status"));
        return m;
    }

    private Map<String, Object> leaseMap(UUID id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT status FROM leases WHERE id = ?", id);
        if (rows.isEmpty()) return null;
        return Map.of("status", rows.get(0).get("status"));
    }
}
