package com.adityoarr.kostpms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

// DUMMY (nol biaya, nol dependensi): tulis ke log aplikasi.
// Lihat via: docker compose logs api | grep REMINDER
@Component
public class LogReminderSender implements ReminderSender {

    private static final Logger log = LoggerFactory.getLogger(LogReminderSender.class);

    @Override
    public String channel() {
        return "DUMMY_LOG";
    }

    @Override
    public void send(String tenantPhone, String tenantName, String message) {
        log.info("[REMINDER][DUMMY] to={} ({}) :: {}", tenantPhone, tenantName, message);
    }
}
