package com.adityoarr.kostpms.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

// Endpoint terpisah untuk email tenant (PII) tanpa menulis ulang TenantService/DTO existing.
// Pemagaran mengikuti matcher /tenants/** yang sudah ada.
@RestController
public class TenantEmailController {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final JdbcTemplate jdbc;

    public TenantEmailController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/tenants/{id}/email")
    public ResponseEntity<Map<String, String>> get(@PathVariable UUID id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT email FROM tenants WHERE id = ?", id);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        Object email = rows.get(0).get("email");
        return ResponseEntity.ok(Map.of("email", email == null ? "" : String.valueOf(email)));
    }

    @PutMapping("/tenants/{id}/email")
    public ResponseEntity<?> put(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        String email = body.get("email") == null ? "" : body.get("email").trim();
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email wajib diisi."));
        }
        if (!EMAIL.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Format email tidak valid."));
        }
        int updated = jdbc.update("UPDATE tenants SET email = ? WHERE id = ?", email, id);
        return updated > 0 ? ResponseEntity.ok(Map.of("email", email))
                           : ResponseEntity.notFound().build();
    }
}
