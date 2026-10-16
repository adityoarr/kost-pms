package com.adityoarr.kostpms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JdbcTemplate jdbc,
                                                   @Value("${app.allowed-origins:}") String allowedOrigins) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/actuator/health", "/actuator/info", "/auth/login").permitAll()
                // FIX A7: /owners tidak lagi permitAll; cek admin platform dilakukan di controller.
                .requestMatchers("/owners/**").hasRole("SUPERADMIN")
                .requestMatchers("/tenant-auth/setup-password", "/tenant-auth/login", "/tenant-auth/forgot-password", "/tenant-auth/reset-password").permitAll()

                .requestMatchers("/tenant-me/**").hasRole("TENANT")
                .requestMatchers(HttpMethod.POST, "/tickets").hasRole("TENANT")

                .requestMatchers("/reports/**").hasAnyRole("SUPERADMIN", "ADMIN")
                                .requestMatchers(HttpMethod.POST, "/reminders/run-all").hasRole("SUPERADMIN")
                .requestMatchers("/reminders/**").hasAnyRole("SUPERADMIN", "ADMIN")

                .requestMatchers("/users/**").hasRole("SUPERADMIN")
                .requestMatchers("/audit/**").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.POST, "/invoices/*/adjustments").hasRole("SUPERADMIN")
                .requestMatchers(HttpMethod.DELETE, "/payments/**").hasRole("SUPERADMIN")

                .requestMatchers(HttpMethod.POST, "/invoices/*/void").hasAnyRole("SUPERADMIN", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/tenants/**").hasAnyRole("SUPERADMIN", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/tenants/*/reset-password").hasAnyRole("SUPERADMIN", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/properties/**").hasAnyRole("SUPERADMIN", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/properties/**").hasAnyRole("SUPERADMIN", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/properties/**").hasAnyRole("SUPERADMIN", "ADMIN")
                .requestMatchers("/units/**").hasAnyRole("SUPERADMIN", "ADMIN")

                .requestMatchers(HttpMethod.POST,
                        "/tenants", "/leases",
                        "/invoices/generate", "/invoices/backfill", "/invoices/*/payments")
                    .hasAnyRole("SUPERADMIN", "ADMIN", "STAFF")
                .requestMatchers(HttpMethod.PUT, "/tenants/**", "/leases/**")
                    .hasAnyRole("SUPERADMIN", "ADMIN", "STAFF")

                .requestMatchers("/tickets/**").hasAnyRole("SUPERADMIN", "ADMIN", "STAFF")

                .requestMatchers(HttpMethod.GET,
                        "/properties/**", "/tenants/**", "/leases/**", "/invoices/**")
                    .hasAnyRole("SUPERADMIN", "ADMIN", "STAFF")

                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            // FIX A6: tolak request ubah-data dari Origin yang tidak dikenal (pengganti CSRF token).
            .addFilterBefore(new CsrfOriginFilter(allowedOrigins), SecurityContextHolderFilter.class)
            // FIX A8: validasi ulang akun (aktif / role / tenant aktif) pada setiap request.
            .addFilterAfter(new SessionRevalidationFilter(jdbc), SecurityContextHolderFilter.class)
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable());
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}