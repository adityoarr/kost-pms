package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.SummaryResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;

@Service
public class ReportService {

    // Zona EKSPISIT: semua batas waktu dihitung di sini, BUKAN di SQL,
    // agar "bulan ini" & "jatuh tempo lewat" konsisten dengan scheduler Jakarta.
    private static final ZoneId JAKARTA = ZoneId.of("Asia/Jakarta");

    private final JdbcTemplate jdbc;

    public ReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public SummaryResponse summary() {
        LocalDate today = LocalDate.now(JAKARTA);
        LocalDate firstOfMonth = YearMonth.from(today).atDay(1);
        LocalDate firstOfNextMonth = firstOfMonth.plusMonths(1);
        OffsetDateTime monthStart = firstOfMonth.atStartOfDay(JAKARTA).toOffsetDateTime();
        OffsetDateTime monthEnd = firstOfNextMonth.atStartOfDay(JAKARTA).toOffsetDateTime();

        // Outstanding + overdue (invoice aktif, bukan VOID). remaining = max(0, net - paid).
        String aggSql =
                "SELECT " +
                "  COALESCE(SUM(GREATEST(i.base_amount - i.discount - COALESCE(p.paid,0), 0)), 0)::bigint AS outstanding, " +
                "  COALESCE(SUM(CASE WHEN i.status IN ('OPEN','PARTIALLY_PAID') AND i.due_date < ? " +
                "                     THEN GREATEST(i.base_amount - i.discount - COALESCE(p.paid,0), 0) ELSE 0 END), 0)::bigint AS overdue_amount, " +
                "  COUNT(*) FILTER (WHERE i.status IN ('OPEN','PARTIALLY_PAID') AND i.due_date < ?)::int AS overdue_count " +
                "FROM invoices i " +
                "LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) p " +
                "  ON p.invoice_id = i.id " +
                "WHERE i.status <> 'VOID'";
        var agg = jdbc.queryForMap(aggSql, today, today);

        // Kas net masuk bulan berjalan (termasuk adjustment negatif = pengurang kas).
        Long collected = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount),0)::bigint FROM payments WHERE paid_at >= ? AND paid_at < ?",
                Long.class, monthStart, monthEnd);

        // Ditagih bulan berjalan (periode = bulan ini, bukan VOID).
        Long billed = jdbc.queryForObject(
                "SELECT COALESCE(SUM(base_amount - discount),0)::bigint FROM invoices " +
                "WHERE period_start >= ? AND period_start < ? AND status <> 'VOID'",
                Long.class, firstOfMonth, firstOfNextMonth);

        // Okupansi: denominator hanya kamar yang bisa disewakan (VACANT+OCCUPIED).
        var occ = jdbc.queryForMap(
                "SELECT COUNT(*) FILTER (WHERE status = 'OCCUPIED')::int AS occupied, " +
                "       COUNT(*) FILTER (WHERE status IN ('VACANT','OCCUPIED'))::int AS rentable " +
                "FROM units");

        Integer openTickets = jdbc.queryForObject(
                "SELECT COUNT(*)::int FROM tickets WHERE status IN ('OPEN','IN_PROGRESS')",
                Integer.class);

        return new SummaryResponse(
                ((Number) agg.get("outstanding")).longValue(),
                ((Number) agg.get("overdue_amount")).longValue(),
                ((Number) agg.get("overdue_count")).intValue(),
                collected == null ? 0L : collected,
                billed == null ? 0L : billed,
                ((Number) occ.get("occupied")).intValue(),
                ((Number) occ.get("rentable")).intValue(),
                openTickets == null ? 0 : openTickets);
    }
}
