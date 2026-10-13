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

@Component
public class InvoiceScheduler {

    private static final Logger log = LoggerFactory.getLogger(InvoiceScheduler.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Jakarta");

    private final InvoiceService invoiceService;
    private final JdbcTemplate jdbc;

    public InvoiceScheduler(InvoiceService invoiceService, JdbcTemplate jdbc) {
        this.invoiceService = invoiceService;
        this.jdbc = jdbc;
    }

    // ---- Cron: tiap tanggal 1, jam 00:01 Asia/Jakarta. ----
    // Generate tagihan untuk periode bulan berjalan.
    @Scheduled(cron = "${app.billing.cron:0 1 0 1 * *}", zone = "Asia/Jakarta")
    public void generateCurrentMonth() {
        YearMonth current = YearMonth.now(ZONE);
        log.info("[SCHEDULER] Trigger bulanan untuk periode {}", current);
        Map<String, Object> r = generateRange(current, current, "system-scheduler");
        log.info("[SCHEDULER] Hasil {}: created={}, skipped={}", current, r.get("created"), r.get("skipped"));
    }

    // ---- Backfill on startup: cek & isi periode terlewat sejak lease aktif. ----
    @EventListener(ApplicationReadyEvent.class)
    public void backfillOnStartup() {
        log.info("[STARTUP-BACKFILL] Memeriksa periode terlewat...");
        try {
            Map<String, Object> r = backfillAllLeases("system-backfill");
            log.info("[STARTUP-BACKFILL] Hasil: created={}, skipped={}", r.get("created"), r.get("skipped"));
        } catch (Exception e) {
            log.error("[STARTUP-BACKFILL] Gagal: {}", e.getMessage());
        }
    }

    // ---- Public method: dipakai controller endpoint manual & test. ----
    public Map<String, Object> generateRange(YearMonth from, YearMonth to, String actor) {
        int totalCreated = 0, totalSkipped = 0;
        YearMonth ym = from;
        while (!ym.isAfter(to)) {
            Map<String, Object> r = invoiceService.generate(ym, actor);
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

    // Cari rentang [start, end] yang mencakup semua lease aktif, lalu backfill.
    public Map<String, Object> backfillAllLeases(String actor) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT MIN(start_date) AS min_start, MAX(COALESCE(end_date, ?::date)) AS max_end " +
                "FROM leases WHERE status = 'ACTIVE'",
                LocalDate.now(ZONE));
        if (rows.isEmpty() || rows.get(0).get("min_start") == null) {
            return Map.of("from", "-", "to", "-", "created", 0, "skipped", 0);
        }
        LocalDate minStart = ((java.sql.Date) rows.get(0).get("min_start")).toLocalDate();
        LocalDate maxEnd = ((java.sql.Date) rows.get(0).get("max_end")).toLocalDate();
        if (maxEnd.isBefore(LocalDate.now(ZONE))) maxEnd = LocalDate.now(ZONE);

        YearMonth from = YearMonth.from(minStart);
        YearMonth to = YearMonth.from(maxEnd);
        return generateRange(from, to, actor);
    }
}