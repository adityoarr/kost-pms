package com.adityoarr.kostpms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * FIX A7: setiap pemilik kost adalah SUPERADMIN organisasinya, jadi "SUPERADMIN" tidak cukup
 * untuk membedakan admin PLATFORM (SaaS) dari owner biasa. Admin platform = SUPERADMIN dengan
 * username yang diset di app.platform-admin-username (env PLATFORM_ADMIN_USERNAME),
 * default "owner" (akun bootstrap pertama).
 */
@Service
public class PlatformAdminService {

    private final String platformAdminUsername;

    public PlatformAdminService(@Value("${app.platform-admin-username:owner}") String platformAdminUsername) {
        this.platformAdminUsername = platformAdminUsername;
    }

    public boolean isPlatformAdmin(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) return false;
        boolean superAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPERADMIN".equals(a.getAuthority()));
        return superAdmin && platformAdminUsername.equals(auth.getName());
    }

    public boolean isCurrentPlatformAdmin() {
        return isPlatformAdmin(SecurityContextHolder.getContext().getAuthentication());
    }
}