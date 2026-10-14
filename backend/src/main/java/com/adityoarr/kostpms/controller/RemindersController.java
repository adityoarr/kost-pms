package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.ReminderLogResponse;
import com.adityoarr.kostpms.dto.ReminderRunResponse;
import com.adityoarr.kostpms.service.ReminderService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/reminders")
public class RemindersController {

    private final ReminderService reminderService;

    public RemindersController(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    // Trigger manual (owner): untuk tes & untuk "kirim sekarang" dari UI.
    @PostMapping("/run")
    public ReminderRunResponse run() {
        return reminderService.runReminders();
    }

    @GetMapping
    public List<ReminderLogResponse> list(@RequestParam(defaultValue = "50") int limit) {
        return reminderService.listRecent(limit);
    }
}
