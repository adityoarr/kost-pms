package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;

public record UserUpdateRequest(
        @NotBlank String fullName,
        @NotBlank String role
) {}
