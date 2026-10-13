package com.adityoarr.kostpms.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record LeaseResponse(
        String id,
        String tenantId,
        String tenantName,
        String tenantPhone,
        String unitId,
        String unitNumber,
        String propertyId,
        String propertyName,
        LocalDate startDate,
        LocalDate endDate,
        long monthlyRate,
        long deposit,
        String status,
        OffsetDateTime terminatedAt,
        OffsetDateTime createdAt
) {}