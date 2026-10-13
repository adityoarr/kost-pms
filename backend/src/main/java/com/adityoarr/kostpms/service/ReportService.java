package com.adityoarr.kostpms.service;

import com.adityoarr.kostpms.dto.PeriodReportResponse;
import com.adityoarr.kostpms.dto.SummaryResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

@Service
public class ReportService {

    // Zona EKSPISIT: batas waktu dihitung di Java, dikirim sebagai nilai absolut
    // ke SQL, sehingga tidak tergantung zona server database.
    private static final ZoneId JAKARTA = ZoneId.of("Asia/Jakarta");

    private final JdbcTemplate jdbc;

    public ReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ================= SUMMARY REAL-TIME (dari 7.2, dipertahankan utuh) =================
    public SummaryResponse summary() {
        LocalDate today = LocalDate.now(JAKARTA);
        LocalDate firstOfMonth = YearMonth.from(today).atDay(1);
        LocalDate firstOfNextMonth = firstOfMonth.plusMonths(1);
        OffsetDateTime monthStart = firstOfMonth.atStartOfDay(JAKARTA).toOffsetDateTime();
        OffsetDateTime monthEnd = firstOfNextMonth.atStartOfDay(JAKARTA).toOffsetDateTime();

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

        Long collected = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount),0)::bigint FROM payments WHERE paid_at >= ? AND paid_at < ?",
                Long.class, monthStart, monthEnd);

        Long billed = jdbc.queryForObject(
                "SELECT COALESCE(SUM(base_amount - discount),0)::bigint FROM invoices " +
                "WHERE period_start >= ? AND period_start < ? AND status <> 'VOID'",
                Long.class, firstOfMonth, firstOfNextMonth);

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

    // ================= REKAP PER PERIODE (baru, 7.3) =================
    private static final String PERIOD_ROWS_SQL =
            "SELECT i.id, i.due_date, i.status, i.base_amount, i.discount, i.late_fee_rate_percent, " +
            "       COALESCE(p.paid, 0) AS paid, " +
            "       tn.name AS tenant_name, tn.phone AS tenant_phone, " +
            "       u.unit_number, pr.name AS property_name " +
            "FROM invoices i " +
            "LEFT JOIN (SELECT invoice_id, SUM(amount) AS paid FROM payments GROUP BY invoice_id) p " +
            "  ON p.invoice_id = i.id " +
            "JOIN leases l ON i.lease_id = l.id " +
            "JOIN tenants tn ON l.tenant_id = tn.id " +
            "JOIN units u ON l.unit_id = u.id " +
            "JOIN properties pr ON u.property_id = pr.id " +
            "WHERE i.period_start >= ? AND i.period_start < ? AND i.status <> 'VOID' " +
            "ORDER BY tn.name, u.unit_number";

    public PeriodReportResponse periodReport(YearMonth period) {
        LocalDate today = LocalDate.now(JAKARTA);
        LocalDate firstOfMonth = period.atDay(1);
        LocalDate firstOfNextMonth = period.plusMonths(1).atDay(1);
        OffsetDateTime monthStart = firstOfMonth.atStartOfDay(JAKARTA).toOffsetDateTime();
        OffsetDateTime monthEnd = firstOfNextMonth.atStartOfDay(JAKARTA).toOffsetDateTime();

        List<PeriodReportResponse.Row> rows = jdbc.query(PERIOD_ROWS_SQL, (rs, n) -> {
            long base = rs.getLong("base_amount");
            long disc = rs.getLong("discount");
            long paid = rs.getLong("paid");
            long remaining = Math.max(0L, base - disc - paid);
            int rate = rs.getInt("late_fee_rate_percent");
            LocalDate due = rs.getObject("due_date", LocalDate.class);
            String stored = rs.getString("status");
            String eff = effectiveStatus(stored, due);
            long lateFee = "OVERDUE".equals(eff) ? Math.round(remaining * rate / 100.0) : 0L;
            return new PeriodReportResponse.Row(
                    rs.getString("id"),
                    rs.getString("tenant_name"),
                    rs.getString("tenant_phone"),
                    rs.getString("unit_number"),
                    rs.getString("property_name"),
                    base, disc, paid, remaining, lateFee, eff);
        }, firstOfMonth, firstOfNextMonth);

        // Semua angka (kecuali collected) dijumlahkan dari DAFTAR BARIS YANG SAMA
        // -> konsistensi internal terjamin oleh konstruksi.
        long billedAmount = 0L, outstandingEnd = 0L, overdueAmount = 0L;
        int paidCount = 0, overdueCount = 0;
        for (var r : rows) {
            billedAmount += (r.baseAmount() - r.discount());
            outstandingEnd += r.remaining();
            if (r.remaining() <= 0) paidCount++;
            if ("OVERDUE".equals(r.effectiveStatus())) {
                overdueCount++;
                overdueAmount += r.remaining();
            }
        }

        // Collected = kas yang TERCATAT pada periode ini (termasuk pelunasan bulan lalu).
        // Sumber terpisah dari rows -> diverifikasi silang via psql di langkah verifikasi.
        Long collected = jdbc.queryForObject(
                "SELECT COALESCE(SUM(amount),0)::bigint FROM payments WHERE paid_at >= ? AND paid_at < ?",
                Long.class, monthStart, monthEnd);

        return new PeriodReportResponse(
                period.toString(),
                billedAmount,
                collected == null ? 0L : collected,
                paidCount,
                overdueCount,
                overdueAmount,
                outstandingEnd,
                rows);
    }

    private String effectiveStatus(String stored, LocalDate due) {
        if (("OPEN".equals(stored) || "PARTIALLY_PAID".equals(stored)) && due.isBefore(LocalDate.now(JAKARTA))) {
            return "OVERDUE";
        }
        return stored;
    }
}
