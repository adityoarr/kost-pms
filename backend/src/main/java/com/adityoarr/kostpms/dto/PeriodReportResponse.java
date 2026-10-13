package com.adityoarr.kostpms.dto;

import java.util.List;

public record PeriodReportResponse(
        String month,
        long billedAmount,
        long collectedAmount,
        int paidCount,
        int overdueCount,
        long overdueAmount,
        long outstandingEnd,
        List<Row> rows
) {
    public record Row(
            String invoiceId,
            String tenantName,
            String tenantPhone,
            String unitNumber,
            String propertyName,
            long baseAmount,
            long discount,
            long paidAmount,
            long remaining,
            long lateFee,
            String effectiveStatus
    ) {}
}
