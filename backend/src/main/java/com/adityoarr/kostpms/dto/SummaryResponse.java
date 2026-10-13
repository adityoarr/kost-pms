package com.adityoarr.kostpms.dto;

public record SummaryResponse(
        long outstanding,
        long overdueAmount,
        int overdueCount,
        long collectedThisMonth,
        long billedThisMonth,
        int occupiedUnits,
        int rentableUnits,
        int openTickets
) {}
