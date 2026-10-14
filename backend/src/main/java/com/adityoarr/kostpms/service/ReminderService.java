package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.ReminderLogResponse;
import com.adityoarr.kostpms.dto.ReminderRunResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ReminderService {

    private static final ZoneId JAKARTA = ZoneId.of("Asia/Jakarta");
    private static final DateTimeFormatter TGL = DateTimeFormatter.ofPattern("d MMM yyyy", new Locale("id", "ID"));

    private final JdbcTemplate jdbc;
    private final PaymentService paymentService;
    private final ReminderSender sender;

    public ReminderService(JdbcTemplate jdbc, PaymentService paymentService, ReminderSender sender) {
        this.jdbc = jdbc;
        this.paymentService = paymentService;
        this.sender = sender;
    }

    private static final String CANDIDATE_SQL =
            "SELECT i.id, i.due_date, i.period_start, t.name AS tenant_name, t.phone AS tenant_phone, " +
            "       u.unit_number, p.name AS property_name " +
            "FROM invoices i " +
            "JOIN leases l ON i.lease_id = l.id " +
            "JOIN tenants t ON l.tenant_id = t.id " +
            "JOIN units u ON l.unit_id = u.id " +
            "JOIN properties p ON u.property_id = p.id " +
            "WHERE i.status IN ('OPEN','PARTIALLY_PAID') AND i.due_date >= ? AND i.due_date <= ? " +
            "ORDER BY i.due_date ASC";

    private final RowMapper<ReminderLogResponse> logMapper = (rs, n) -> new ReminderLogResponse(
            rs.getString("id"),
            rs.getString("kind"),
            rs.getString("channel"),
            rs.getString("message"),
            rs.getLong("amount_due"),
            rs.getObject("sent_at", OffsetDateTime.class),
            rs.getString("tenant_name"),
            rs.getString("tenant_phone"),
            rs.getString("unit_number"),
            rs.getString("property_name"),
            rs.getObject("period_start", LocalDate.class),
            rs.getObject("due_date", LocalDate.class)
    );

    // ===== Jalankan satu putaran reminder. Idempoten via UNIQUE(invoice_id, kind). =====
    public ReminderRunResponse runReminders() {
        LocalDate today = LocalDate.now(JAKARTA);
        int dueSoon = processWindow(today, today.plusDays(3), "DUE_SOON");
        int overdue = processWindow(today.minusDays(90), today.minusDays(3), "OVERDUE");
        int skipped = countAlreadyLogged(today, today.plusDays(3))
                    + countAlreadyLogged(today.minusDays(90), today.minusDays(3));
        return new ReminderRunResponse(dueSoon, overdue, skipped);
    }

    // Jendela [from, to] inklusif. DUE_SOON dipanggil [today, today+3];
    // OVERDUE dipanggil [today-90, today-3] (batas bawah agar tidak menyapu tagihan purba).
    private int processWindow(LocalDate from, LocalDate to, String kind) {
        List<Map<String, Object>> rows = jdbc.queryForList(CANDIDATE_SQL, from, to);
        int sent = 0;
        for (Map<String, Object> r : rows) {
            UUID invoiceId = UUID.fromString(String.valueOf(r.get("id")));
            if (alreadyLogged(invoiceId, kind)) continue;
            PaymentService.Breakdown b = paymentService.breakdownOf(invoiceId);
            if (b.totalDue <= 0L) continue; // lunas: tidak ada yang diingatkan
            String message = buildMessage(kind, r, b.totalDue);
            sender.send(String.valueOf(r.get("tenant_phone")), String.valueOf(r.get("tenant_name")), message);
            jdbc.update(
                    "INSERT INTO reminder_logs (id, invoice_id, kind, channel, message, amount_due) " +
                    "VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (invoice_id, kind) DO NOTHING",
                    UUID.randomUUID(), invoiceId, kind, sender.channel(), message, b.totalDue);
            sent++;
        }
        return sent;
    }

    private boolean alreadyLogged(UUID invoiceId, String kind) {
        Integer c = jdbc.queryForObject(
                "SELECT COUNT(*) FROM reminder_logs WHERE invoice_id = ? AND kind = ?",
                Integer.class, invoiceId, kind);
        return c != null && c > 0;
    }

    private int countAlreadyLogged(LocalDate from, LocalDate to) {
        Integer c = jdbc.queryForObject(
                "SELECT COUNT(*) FROM reminder_logs r JOIN invoices i ON r.invoice_id = i.id " +
                "WHERE i.status IN ('OPEN','PARTIALLY_PAID') AND i.due_date >= ? AND i.due_date <= ?",
                Integer.class, from, to);
        return c == null ? 0 : c;
    }

    private String buildMessage(String kind, Map<String, Object> r, long totalDue) {
        String name = String.valueOf(r.get("tenant_name"));
        String unit = String.valueOf(r.get("unit_number"));
        String prop = String.valueOf(r.get("property_name"));
        LocalDate due = ((java.sql.Date) r.get("due_date")).toLocalDate();
        String rp = "Rp" + java.text.NumberFormat.getInstance(new Locale("id", "ID")).format(totalDue);
        if ("DUE_SOON".equals(kind)) {
            return String.format("Halo %s, tagihan Kamar %s (%s) sebesar %s akan jatuh tempo pada %s. Silakan lakukan pembayaran tepat waktu.",
                    name, unit, prop, rp, due.format(TGL));
        }
        return String.format("Halo %s, tagihan Kamar %s (%s) sebesar %s SUDAH LEWAT jatuh tempo sejak %s. Mohon segera lakukan pembayaran untuk menghindari penumpukan denda.",
                name, unit, prop, rp, due.format(TGL));
    }

    // ===== Riwayat pengingat (opsional, untuk ops/audit) =====
    public List<ReminderLogResponse> listRecent(int limit) {
        int lim = Math.min(Math.max(limit, 1), 200);
        return jdbc.query(
                "SELECT r.id, r.kind, r.channel, r.message, r.amount_due, r.sent_at, " +
                "       t.name AS tenant_name, t.phone AS tenant_phone, u.unit_number, p.name AS property_name, " +
                "       i.period_start, i.due_date " +
                "FROM reminder_logs r " +
                "JOIN invoices i ON r.invoice_id = i.id " +
                "JOIN leases l ON i.lease_id = l.id " +
                "JOIN tenants t ON l.tenant_id = t.id " +
                "JOIN units u ON l.unit_id = u.id " +
                "JOIN properties p ON u.property_id = p.id " +
                "ORDER BY r.sent_at DESC LIMIT ?",
                logMapper, lim);
    }
}
