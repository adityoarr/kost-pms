package com.adityoarr.kostpms.dto;

public record TicketUpdateRequest(
        String status,              // opsional
        String assignedToUsername,  // opsional
        String resolutionNote       // opsional
) {}
