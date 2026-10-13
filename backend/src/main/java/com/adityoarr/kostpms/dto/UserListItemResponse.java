package com.adityoarr.kostpms.dto;

import java.time.OffsetDateTime;

public record UserListItemResponse(
        String id,
        String username,
        String fullName,
        String role,
        String status,
        OffsetDateTime createdAt
) {}
