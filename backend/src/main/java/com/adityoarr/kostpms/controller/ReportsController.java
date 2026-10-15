package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.PeriodReportResponse;
import com.adityoarr.kostpms.dto.SummaryResponse;
import com.adityoarr.kostpms.dto.TrendResponse;
import com.adityoarr.kostpms.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.DateTimeException;
import java.time.YearMonth;
import java.util.Map;

@RestController
@RequestMapping("/reports")
public class ReportsController {

    private final ReportService reportService;

    public ReportsController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/summary")
    public SummaryResponse summary() {
        return reportService.summary();
    }

    @GetMapping("/period")
    public ResponseEntity<?> period(@RequestParam String month) {
        try {
            YearMonth ym = YearMonth.parse(month);
            return ResponseEntity.ok(reportService.periodReport(ym));
        } catch (DateTimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Format month harus YYYY-MM, contoh: 2026-10."));
        }
    }


    @GetMapping("/trend")
    public TrendResponse trend(@RequestParam(defaultValue = "6") int months) {
        return reportService.trend(months);
    }

}
