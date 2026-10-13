package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;

public record TicketCreateRequest(
        String unitId,          // opsional; kosong = kamar dari kontrak aktif
        @NotBlank String category,
        @NotBlank String title,
        String description
) {}
