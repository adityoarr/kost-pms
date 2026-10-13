package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.SummaryResponse;
import com.adityoarr.kostpms.service.ReportService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
