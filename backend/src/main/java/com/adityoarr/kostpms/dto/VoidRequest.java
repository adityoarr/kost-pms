package com.adityoarr.kostpms.dto;

import jakarta.validation.constraints.NotBlank;

public record VoidRequest(@NotBlank String reason) {}
