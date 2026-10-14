package com.adityoarr.kostpms.service;

// Kontrak channel pengingat. Mesin reminder hanya bergantung pada interface ini,
// sehingga mengganti dummy -> WhatsApp/email/Telegram = mengganti SATU implementasi.
public interface ReminderSender {
    String channel();
    void send(String tenantPhone, String tenantName, String message);
}
