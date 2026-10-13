package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.dto.UserCreateRequest;
import com.adityoarr.kostpms.dto.UserResetPasswordRequest;
import com.adityoarr.kostpms.dto.UserListItemResponse;
import com.adityoarr.kostpms.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UsersController {

    private final UserService userService;

    public UsersController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserListItemResponse> list() {
        return userService.findAll();
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody UserCreateRequest req) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable UUID id,
                                                              @Valid @RequestBody UserResetPasswordRequest req) {
        boolean ok = userService.resetPassword(id, req.newPassword());
        return ok ? ResponseEntity.ok(Map.of("status", "password_reset"))
                  : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deactivate(@PathVariable UUID id) {
        try {
            String actor = SecurityContextHolder.getContext().getAuthentication().getName();
            boolean ok = userService.deactivate(id, actor);
            return ok ? ResponseEntity.ok(Map.of("status", "inactive"))
                      : ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
