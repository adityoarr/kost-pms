package com.adityoarr.kostpms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class InvoiceScheduler {

    private static final Logger log = LoggerFactory.getLogger(InvoiceScheduler.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Jakarta");

    private final InvoiceService invoiceService;
    private final OwnerContextService ownerContext;
    private final JdbcTemplate jdbc;

    public InvoiceScheduler(InvoiceService invoiceService, OwnerContextService ownerContext, JdbcTemplate jdbc) {
        this.invoiceService = invoiceService;
        this.ownerContext = ownerContext;
        this.jdbc = jdbc;
    }

    // Semua owner (organisasi) = SUPERADMIN dengan owner_id = id sendiri.
    private List<UUID> allOwnerIds() {
        return jdbc.queryForList(
                "SELECT id FROM users WHERE role = 'SUPERADMIN' AND owner_id = id ORDER BY created_at",
                UUID.class);
    }

    // ---- Cron: tiap tanggal 1, jam 00:01 Asia/Jakarta. ----
    // FIX A3: loop semua owner dengan ownerId eksplisit (thread scheduler tidak punya SecurityContext).
    @Scheduled(cron = "${app.billing.cron:0 1 0 1 * *}", zone = "Asia/Jakarta")
    public void generateCurrentMonth() {
        YearMonth current = YearMonth.now(ZONE);
        log.info("[SCHEDULER] Trigger bulanan untuk periode {}", current);
        int created = 0, skipped = 0;
        for (UUID ownerId : allOwnerIds()) {
            try {
                Map<String, Object> r = invoiceService.generateForOwner(current, "system-scheduler", ownerId);
                created += ((Number) r.get("created")).intValue();
                skipped += ((Number) r.get("skipped")).intValue();
            } catch (Exception e) {
                log.error("[SCHEDULER] owner={} gagal: {}", ownerId, e.getMessage(), e);
            }
        }
        log.info("[SCHEDULER] Hasil {}: created={}, skipped={}", current, created, skipped);
    }

    // ---- Backfill on startup: cek & isi periode terlewat sejak lease aktif, per owner. ----
    @EventListener(ApplicationReadyEvent.class)
    public void backfillOnStartup() {
        log.info("[STARTUP-BACKFILL] Memeriksa periode terlewat...");
        int created = 0, skipped = 0;
        for (UUID ownerId : allOwnerIds()) {
            try {
                Map<String, Object> r = backfillAllLeasesForOwner(ownerId, "system-backfill");
                created += ((Number) r.get("created")).intValue();
                skipped += ((Number) r.get("skipped")).intValue();
            } catch (Exception e) {
                log.error("[STARTUP-BACKFILL] owner={} gagal: {}", ownerId, e.getMessage(), e);
            }
        }
        log.info("[STARTUP-BACKFILL] Hasil: created={}, skipped={}", created, skipped);
    }

    // ---- Dipakai controller endpoint manual (/invoices/backfill): owner dari SecurityContext. ----
    public Map<String, Object> generateRange(YearMonth from, YearMonth to, String actor) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) throw new IllegalStateException("Owner context tidak tersedia.");
        return generateRangeForOwner(from, to, actor, ownerId);
    }

    public Map<String, Object> generateRangeForOwner(YearMonth from, YearMonth to, String actor, UUID ownerId) {
        int totalCreated = 0, totalSkipped = 0;
        YearMonth ym = from;
        while (!ym.isAfter(to)) {
            Map<String, Object> r = invoiceService.generateForOwner(ym, actor, ownerId);
            totalCreated += ((Number) r.get("created")).intValue();
            totalSkipped += ((Number) r.get("skipped")).intValue();
            ym = ym.plusMonths(1);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("from", from.toString());
        result.put("to", to.toString());
        result.put("created", totalCreated);
        result.put("skipped", totalSkipped);
        return result;
    }

    // Cari rentang [min start lease aktif, bulan berjalan] untuk satu owner, lalu backfill.
    // FIX: batas atas dikunci ke bulan berjalan, tidak lagi menghasilkan invoice masa depan
    // hanya karena end_date lease di masa depan.
    public Map<String, Object> backfillAllLeasesForOwner(UUID ownerId, String actor) {
        List<LocalDate> minStarts = jdbc.query(
                "SELECT MIN(start_date) AS min_start FROM leases WHERE status = 'ACTIVE' AND owner_id = ?",
                (rs, n) -> rs.getObject("min_start", LocalDate.class),
                ownerId);
        LocalDate minStart = minStarts.isEmpty() ? null : minStarts.get(0);
        if (minStart == null) {
            return Map.of("from", "-", "to", "-", "created", 0, "skipped", 0);
        }
        YearMonth from = YearMonth.from(minStart);
        YearMonth to = YearMonth.now(ZONE);
        if (from.isAfter(to)) {
            return Map.of("from", "-", "to", "-", "created", 0, "skipped", 0);
        }
        return generateRangeForOwner(from, to, actor, ownerId);
    }
}