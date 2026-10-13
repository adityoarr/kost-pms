package com.adityoarr.kostpms.dto;

import java.time.OffsetDateTime;

public record TenantResponse(
        String id,
        String name,
        String phone,
        String nik,
        String address,
        String notes,
        String status,
        String createdByUsername,
        OffsetDateTime createdAt
) {}