package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TenantRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{6,14}$",
                message = "Nomor HP harus format internasional, contoh: +6281234567890")
        String phone,
        String nik,
        String address,
        String notes
) {}