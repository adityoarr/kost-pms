package com.adityoarr.kostpms.controller;

import com.adityoarr.kostpms.service.OwnerContextService;
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
// Pemagaran role mengikuti matcher /tenants/** yang sudah ada.
// FIX A5: setiap query kini di-scope ke owner_id organisasi pemanggil.
@RestController
public class TenantEmailController {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int EMAIL_MAX = 254;

    private final JdbcTemplate jdbc;
    private final OwnerContextService ownerContext;

    public TenantEmailController(JdbcTemplate jdbc, OwnerContextService ownerContext) {
        this.jdbc = jdbc;
        this.ownerContext = ownerContext;
    }

    @GetMapping("/tenants/{id}/email")
    public ResponseEntity<Map<String, String>> get(@PathVariable UUID id) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return ResponseEntity.notFound().build();
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT email FROM tenants WHERE id = ? AND owner_id = ?", id, ownerId);
        if (rows.isEmpty()) return ResponseEntity.notFound().build();
        Object email = rows.get(0).get("email");
        return ResponseEntity.ok(Map.of("email", email == null ? "" : String.valueOf(email)));
    }

    @PutMapping("/tenants/{id}/email")
    public ResponseEntity<?> put(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        UUID ownerId = ownerContext.getCurrentOwnerId();
        if (ownerId == null) return ResponseEntity.notFound().build();
        String email = body.get("email") == null ? "" : body.get("email").trim();
        if (email.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email wajib diisi."));
        }
        if (email.length() > EMAIL_MAX || !EMAIL.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Format email tidak valid."));
        }
        int updated = jdbc.update(
                "UPDATE tenants SET email = ? WHERE id = ? AND owner_id = ?", email, id, ownerId);
        return updated > 0 ? ResponseEntity.ok(Map.of("email", email))
                           : ResponseEntity.notFound().build();
    }
}