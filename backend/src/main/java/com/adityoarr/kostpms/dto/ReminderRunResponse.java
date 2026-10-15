package com.adityoarr.kostpms.dto;

public record ReminderRunResponse(
        int dueEarlySent,
        int dueSoonSent,
        int dueUrgentSent,
        int overdueSent,
        int skipped
) {}
