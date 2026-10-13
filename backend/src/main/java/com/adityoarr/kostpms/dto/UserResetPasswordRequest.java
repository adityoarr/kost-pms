package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;

public record UserResetPasswordRequest(@NotBlank String newPassword) {}