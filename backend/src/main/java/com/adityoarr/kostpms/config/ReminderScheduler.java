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

    // Thread cron TIDAK punya SecurityContext -> wajib loop per owner via runAllOwners(),
    // BUKAN runReminders() yang resolve context (itu akan mati senyap = bug R5).
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Jakarta")
    public void dailyReminders() {
        try {
            reminderService.runAllOwners();
        } catch (Exception e) {
            log.error("[REMINDER] run harian gagal", e);
        }
    }
}
