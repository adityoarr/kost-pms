package com.adityoarr.kostpms.dto;

import java.util.List;

public record UserResponse(
        String username,
        List<String> roles
) {}