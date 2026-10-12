package com.adityoarr.kostpms.bootstrap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BootstrapAdmin implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final String bootstrapPassword;

    public BootstrapAdmin(JdbcTemplate jdbcTemplate,
                          PasswordEncoder passwordEncoder,
                          @Value("${KOST_BOOTSTRAP_ADMIN_PASSWORD:}") String bootstrapPassword) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.bootstrapPassword = bootstrapPassword;
    }

    @Override
    public void run(String... args) {
        if (bootstrapPassword == null || bootstrapPassword.isBlank()) {
            throw new IllegalStateException(
                    "KOST_BOOTSTRAP_ADMIN_PASSWORD belum diisi di .env backend");
        }
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        if (count != null && count > 0) {
            return;
        }
        jdbcTemplate.update(
                "INSERT INTO users (username, full_name, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
                "owner",
                "Pemilik Kost (Superadmin)",
                passwordEncoder.encode(bootstrapPassword),
                "SUPERADMIN",
                "ACTIVE"
        );
        System.out.println("== BOOTSTRAP: superadmin 'owner' berhasil dibuat ==");
    }
}