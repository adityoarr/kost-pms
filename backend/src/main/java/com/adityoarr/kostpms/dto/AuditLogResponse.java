package com.adityoarr.kostpms.dto;

import java.time.OffsetDateTime;

public record AuditLogResponse(
        String id,
        String actorUsername,
        String actorRole,
        String action,
        String entityType,
        String entityId,
        String httpMethod,
        int httpStatus,
        String ip,
        String detailBefore,
        String detailAfter,
        OffsetDateTime createdAt
) {}
