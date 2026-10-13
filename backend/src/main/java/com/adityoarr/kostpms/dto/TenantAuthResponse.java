package com.adityoarr.kostpms.dto;

public record TenantAuthResponse(
        String tenantId,
        String name,
        String phone,
        String role
) {}