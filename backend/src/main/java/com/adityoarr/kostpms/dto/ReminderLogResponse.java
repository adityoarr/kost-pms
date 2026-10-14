package com.adityoarr.kostpms.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record ReminderLogResponse(
        String id,
        String kind,
        String channel,
        String message,
        long amountDue,
        OffsetDateTime sentAt,
        String tenantName,
        String tenantPhone,
        String unitNumber,
        String propertyName,
        LocalDate periodStart,
        LocalDate dueDate
) {}
