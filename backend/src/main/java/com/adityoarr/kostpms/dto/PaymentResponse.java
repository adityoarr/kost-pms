package com.adityoarr.kostpms.dto;

import java.time.OffsetDateTime;

public record PaymentResponse(
        String id,
        String invoiceId,
        long amount,
        String method,
        String reference,
        OffsetDateTime paidAt,
        boolean isAdjustment,
        String receivedByUsername,
        OffsetDateTime createdAt
) {}