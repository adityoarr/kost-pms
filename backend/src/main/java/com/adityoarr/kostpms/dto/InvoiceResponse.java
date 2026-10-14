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
        String status,            // tersimpan: OPEN|PARTIALLY_PAID|PAID|VOID
        String effectiveStatus,   // diturunkan (+OVERDUE bila lewat jatuh tempo)
        long paidAmount,          // total tercatat (pokok+denda)
        long principalRemaining,  // sisa pokok (belum termasuk denda)
        long feeAmount,           // denda TURUNAN dari principalRemaining
        long totalDue,            // principalRemaining + feeAmount = batas catat
        String voidReason,
        String createdByUsername,
        OffsetDateTime createdAt
) {}
