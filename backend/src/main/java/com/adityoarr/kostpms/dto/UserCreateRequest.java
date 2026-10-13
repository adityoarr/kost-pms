package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;

public record UserCreateRequest(
        @NotBlank String username,
        @NotBlank String fullName,
        @NotBlank String password,
        @NotBlank String role
) {}