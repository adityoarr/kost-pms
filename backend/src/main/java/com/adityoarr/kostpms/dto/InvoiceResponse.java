package com.adityoarr.kostpms.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record InvoiceResponse(
        String id,
        String leaseId,
        String tenantName,
        String tenantPhone,
        String unitNumber,
        String propertyName,
        LocalDate periodStart,
        LocalDate periodEnd,
        LocalDate dueDate,
        long baseAmount,
        long discount,
        int lateFeeRatePercent,
        String status,            // status tersimpan: OPEN|PARTIALLY_PAID|PAID|VOID
        String effectiveStatus,   // diturunkan saat dibaca: + OVERDUE bila lewat jatuh tempo
        long paidAmount,
        long remaining,
        long lateFee,
        long totalDue,
        String voidReason,
        String createdByUsername,
        OffsetDateTime createdAt
) {}