package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;

public record PropertyRequest(
        @NotBlank String name,
        @NotBlank String address,
        @NotBlank String city,
        String province,
        String phone
) {}