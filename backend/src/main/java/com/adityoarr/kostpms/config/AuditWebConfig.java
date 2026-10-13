package com.adityoarr.kostpms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AuditWebConfig implements WebMvcConfigurer {

    private final AuditInterceptor auditInterceptor;

    public AuditWebConfig(AuditInterceptor auditInterceptor) {
        this.auditInterceptor = auditInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Pahami SEMUA request; penyaringan aksi sensitif terjadi di dalam interceptor (regex).
        // Overhead beberapa regex per request: dapat diabaikan pada skala kost.
        registry.addInterceptor(auditInterceptor).addPathPatterns("/**");
    }
}
