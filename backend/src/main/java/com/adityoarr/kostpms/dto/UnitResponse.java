package com.adityoarr.kostpms.dto;

import java.util.List;

public record UnitResponse(
        String id,
        String propertyId,
        String propertyName, // Bonus: nama properti agar frontend tidak perlu query ulang
        String unitNumber,
        String unitType,
        int capacity,
        long monthlyRate,
        List<String> facilities,
        String status
) {}