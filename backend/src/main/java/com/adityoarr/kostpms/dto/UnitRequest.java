package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record UnitRequest(
        String propertyId, // Sekarang OPSIONAL (null allowed). Diabaikan jika kirim via path.
        @NotBlank String unitNumber,
        String unitType,
        @Min(1) Integer capacity,
        @Min(0) Long monthlyRate,
        List<String> facilities,
        String status
) {}