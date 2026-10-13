package com.adityoarr.kostpms.dto;

import java.time.OffsetDateTime;

public record TicketResponse(
        String id,
        String tenantId,
        String tenantName,
        String tenantPhone,
        String unitId,
        String unitNumber,
        String propertyName,
        String category,
        String title,
        String description,
        String status,
        String assignedToUsername,
        OffsetDateTime resolvedAt,
        String resolutionNote,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
