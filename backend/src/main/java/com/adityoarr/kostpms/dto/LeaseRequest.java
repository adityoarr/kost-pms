package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record LeaseRequest(
        @NotBlank String tenantId,
        @NotBlank String unitId,
        @NotNull LocalDate startDate,
        LocalDate endDate,          // opsional
        Long monthlyRate,           // opsional; jika kosong, diambil snapshot dari tarif kamar
        Long deposit                // opsional
) {}