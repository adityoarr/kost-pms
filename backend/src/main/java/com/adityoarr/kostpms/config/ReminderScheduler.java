package com.adityoarr.kostpms.config;

import com.adityoarr.kostpms.service.ReminderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);
    private final ReminderService reminderService;

    public ReminderScheduler(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Jakarta")
    public void dailyReminders() {
        try {
            var r = reminderService.runReminders();
            log.info("[REMINDER] run harian selesai: dueSoon={} overdue={} skipped={}",
                    r.dueSoonSent(), r.overdueSent(), r.skipped());
        } catch (Exception e) {
            // Jangan biarkan kegagalan satu putaran mematikan thread scheduler.
            log.error("[REMINDER] run harian gagal", e);
        }
    }
}
