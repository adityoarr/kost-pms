package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.ReminderLogResponse;
import com.adityoarr.kostpms.dto.ReminderRunResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReminderService {

    private static final ZoneId JAKARTA = ZoneId.of("Asia/Jakarta");
    private static final DateTimeFormatter TGL = DateTimeFormatter.ofPattern("d MMM yyyy", new Locale("id", "ID"));

    private final JdbcTemplate jdbc;
    private final PaymentService paymentService;
    private final ReminderSender sender;
    private final OwnerContextService ownerContext;
    private final String enabledKindsRaw;

    public ReminderService(JdbcTemplate jdbc,
                           PaymentService paymentService,
                           ReminderSender sender,
                           OwnerContextService ownerContext,
                           @Value("${app.reminder.enabled-kinds:DUE_EARLY,DUE_SOON,DUE_URGENT,OVERDUE}") String enabledKindsRaw) {
        this.jdbc = jdbc;
        this.paymentService = paymentService;
        this.sender = sender;
        this.ownerContext = ownerContext;
        this.enabledKindsRaw = enabledKindsRaw;
    }

    private Set<String> enabledKinds() {
        return Arrays.stream(enabledKindsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    private static final String CANDIDATE_SQL =
            "SELECT i.id, i.due_date, i.period_start, t.name AS tenant_name, t.phone AS tenant_phone, " +
            "       u.unit_number, p.name AS property_name " +
            "FROM invoices i " +
            "JOIN leases l ON i.lease_id = l.id " +
            "JOIN tenants t ON l.tenant_id = t.id " +
            "JOIN units u ON l.unit_id = u.id " +
            "JOIN properties p ON u.property_id = p.id " +
            "WHERE i.status IN ('OPEN','PARTIALLY_PAID') AND i.due_date >= ? AND i.due_date <= ? AND p.owner_id = ? " +
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

    public ReminderRunResponse runReminders() {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return new ReminderRunResponse(0, 0, 0, 0, 0);
        LocalDate today = LocalDate.now(JAKARTA);
        Set<String> on = enabledKinds();

        int early  = on.contains("DUE_EARLY")  ? processWindow(today.plusDays(4),  today.plusDays(7), "DUE_EARLY", ownerId)  : 0;
        int soon   = on.contains("DUE_SOON")   ? processWindow(today,              today.plusDays(3), "DUE_SOON", ownerId)   : 0;
        int urgent = on.contains("DUE_URGENT") ? processWindow(today,              today.plusDays(1), "DUE_URGENT", ownerId) : 0;
        int over   = on.contains("OVERDUE")    ? processWindow(today.minusDays(90), today.minusDays(3), "OVERDUE", ownerId)  : 0;

        int skipped = 0;
        if (on.contains("DUE_EARLY"))  skipped += countAlreadyLogged(today.plusDays(4),   today.plusDays(7), "DUE_EARLY", ownerId);
        if (on.contains("DUE_SOON"))   skipped += countAlreadyLogged(today,               today.plusDays(3), "DUE_SOON", ownerId);
        if (on.contains("DUE_URGENT")) skipped += countAlreadyLogged(today,               today.plusDays(1), "DUE_URGENT", ownerId);
        if (on.contains("OVERDUE"))    skipped += countAlreadyLogged(today.minusDays(90), today.minusDays(3), "OVERDUE", ownerId);

        return new ReminderRunResponse(early, soon, urgent, over, skipped);
    }

    private int processWindow(LocalDate from, LocalDate to, String kind, UUID ownerId) {
        List<Map<String, Object>> rows = jdbc.queryForList(CANDIDATE_SQL, from, to, ownerId);
        int sent = 0;
        for (Map<String, Object> r : rows) {
            UUID invoiceId = UUID.fromString(String.valueOf(r.get("id")));
            if (alreadyLogged(invoiceId, kind, ownerId)) continue;
            PaymentService.Breakdown b = paymentService.breakdownOf(invoiceId);
            if (b.totalDue <= 0L) continue;
            String message = buildMessage(kind, r, b.totalDue);
            sender.send(String.valueOf(r.get("tenant_phone")), String.valueOf(r.get("tenant_name")), message);
            jdbc.update(
                    "INSERT INTO reminder_logs (id, invoice_id, kind, channel, message, amount_due, owner_id) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (invoice_id, kind) DO NOTHING",
                    UUID.randomUUID(), invoiceId, kind, sender.channel(), message, b.totalDue, ownerId);
            sent++;
        }
        return sent;
    }

    private boolean alreadyLogged(UUID invoiceId, String kind, UUID ownerId) {
        Integer c = jdbc.queryForObject(
                "SELECT COUNT(*) FROM reminder_logs WHERE invoice_id = ? AND kind = ? AND owner_id = ?",
                Integer.class, invoiceId, kind, ownerId);
        return c != null && c > 0;
    }

    private int countAlreadyLogged(LocalDate from, LocalDate to, String kind, UUID ownerId) {
        Integer c = jdbc.queryForObject(
                "SELECT COUNT(*) FROM reminder_logs r JOIN invoices i ON r.invoice_id = i.id " +
                "JOIN leases l ON i.lease_id = l.id JOIN tenants t ON l.tenant_id = t.id " +
                "WHERE r.kind = ? AND i.status IN ('OPEN','PARTIALLY_PAID') AND i.due_date >= ? AND i.due_date <= ? AND t.owner_id = ?",
                Integer.class, kind, from, to, ownerId);
        return c == null ? 0 : c;
    }

    private String buildMessage(String kind, Map<String, Object> r, long totalDue) {
        String name = String.valueOf(r.get("tenant_name"));
        String unit = String.valueOf(r.get("unit_number"));
        String prop = String.valueOf(r.get("property_name"));
        LocalDate due = ((java.sql.Date) r.get("due_date")).toLocalDate();
        String rp = "Rp" + java.text.NumberFormat.getInstance(new Locale("id", "ID")).format(totalDue);
        String tgl = due.format(TGL);
        switch (kind) {
            case "DUE_EARLY":
                return String.format("Halo %s, pengingat dini: tagihan Kamar %s (%s) sebesar %s akan jatuh tempo pada %s. Silakan siapkan pembayaran.", name, unit, prop, rp, tgl);
            case "DUE_URGENT":
                return String.format("Halo %s, PERHATIAN: tagihan Kamar %s (%s) sebesar %s jatuh tempo pada %s (segera). Mohon lakukan pembayaran hari ini atau besok.", name, unit, prop, rp, tgl);
            case "OVERDUE":
                return String.format("Halo %s, tagihan Kamar %s (%s) sebesar %s SUDAH LEWAT jatuh tempo sejak %s. Mohon segera lakukan pembayaran untuk menghindari penumpukan denda.", name, unit, prop, rp, tgl);
            default:
                return String.format("Halo %s, tagihan Kamar %s (%s) sebesar %s akan jatuh tempo pada %s. Silakan lakukan pembayaran tepat waktu.", name, unit, prop, rp, tgl);
        }
    }

    public List<ReminderLogResponse> listRecent(int limit) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return List.of();
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
                "WHERE r.owner_id = ? " +
                "ORDER BY r.sent_at DESC LIMIT ?",
                logMapper, ownerId, lim);
    }
}
