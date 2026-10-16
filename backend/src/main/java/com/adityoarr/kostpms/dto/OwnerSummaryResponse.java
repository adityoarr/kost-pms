package com.adityoarr.kostpms.dto;

import java.time.OffsetDateTime;

public record OwnerSummaryResponse(
        String id,
        String username,
        String fullName,
        OffsetDateTime createdAt
) {}
