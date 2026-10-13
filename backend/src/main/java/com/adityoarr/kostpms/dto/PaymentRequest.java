package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record PaymentRequest(
        @NotNull @Positive Long amount,
        @NotBlank String method,
        String reference,
        String paidAt   // opsional, ISO-8601; kosong = sekarang
) {}