package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.ReminderLogResponse;
import com.adityoarr.kostpms.dto.ReminderRunResponse;
import com.adityoarr.kostpms.service.PlatformAdminService;
import com.adityoarr.kostpms.service.ReminderService;
import org.springframework.http.ResponseEntity;
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
    private final PlatformAdminService platformAdmin;

    public RemindersController(ReminderService reminderService, PlatformAdminService platformAdmin) {
        this.reminderService = reminderService;
        this.platformAdmin = platformAdmin;
    }

    // Trigger manual (owner): untuk tes & untuk "kirim sekarang" dari UI.
    @PostMapping("/run")
    public ReminderRunResponse run() {
        return reminderService.runReminders();
    }

    // FIX A7: lintas SEMUA organisasi -> hanya admin platform.
    @PostMapping("/run-all")
    public ResponseEntity<?> runAll() {
        if (!platformAdmin.isCurrentPlatformAdmin()) {
            return ResponseEntity.status(403).body(java.util.Map.of("error", "Hanya admin platform."));
        }
        return ResponseEntity.ok(reminderService.runAllOwners());
    }


    @GetMapping
    public List<ReminderLogResponse> list(@RequestParam(defaultValue = "50") int limit) {
        return reminderService.listRecent(limit);
    }
}