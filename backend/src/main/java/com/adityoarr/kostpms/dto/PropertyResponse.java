package com.adityoarr.kostpms.dto;

public record PropertyResponse(
        String id,
        String name,
        String address,
        String city,
        String province,
        String phone,
        String status,
        String createdByUsername
) {}