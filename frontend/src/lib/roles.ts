// src/lib/roles.ts
export const OWNER_ROLES = ["ROLE_SUPERADMIN", "ROLE_ADMIN"];

export function isSuperAdmin(roles: string[]): boolean {
    return roles.includes("ROLE_SUPERADMIN");
}

export function isOwnerRole(roles: string[]): boolean {
    return roles.some((r) => OWNER_ROLES.includes(r));
}

// FIX A7: admin platform (SaaS) = SUPERADMIN dengan username platform; ditandai backend lewat /auth/me.
export function isPlatformAdmin(roles: string[]): boolean {
    return roles.includes("PLATFORM_ADMIN");
}

export function isStaff(roles: string[]): boolean {
    return roles.includes("ROLE_STAFF") && !isOwnerRole(roles);
}