package com.adityoarr.kostpms.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class DbUserDetailsService implements UserDetailsService {

    private final JdbcTemplate jdbcTemplate;

    public DbUserDetailsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT username, password_hash, role, status FROM users WHERE username = ?",
                username
        );
        if (rows.isEmpty()) {
            throw new UsernameNotFoundException("User tidak ditemukan: " + username);
        }
        Map<String, Object> row = rows.get(0);
        boolean active = "ACTIVE".equals(row.get("status"));
        return User.withUsername((String) row.get("username"))
                .password((String) row.get("password_hash"))
                .authorities("ROLE_" + row.get("role"))
                .disabled(!active)
                .build();
    }
}