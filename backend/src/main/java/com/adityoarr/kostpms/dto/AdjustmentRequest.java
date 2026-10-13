package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.Negative;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdjustmentRequest(
        @NotNull @Negative Long amount,   // wajib negatif
        @NotBlank String reason
) {}