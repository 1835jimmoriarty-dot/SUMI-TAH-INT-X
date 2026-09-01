import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, PERMISSIONS, ROLE_PERMISSIONS_MAP, SYSTEM_ROLES } from '../src/lib/rbac';

describe('RBAC & Authorization Matrix', () => {
  it('should allow admin full access with admin:manage permission', () => {
    const adminPerms = [PERMISSIONS.ADMIN_MANAGE];
    expect(hasPermission(adminPerms, PERMISSIONS.CASES_DELETE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.SOAR_APPROVE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.INTEGRATIONS_MANAGE)).toBe(true);
  });

  it('should grant lead threat hunter proper investigation permissions', () => {
    const hunterPerms = ROLE_PERMISSIONS_MAP[SYSTEM_ROLES.LEAD_HUNTER];
    expect(hasPermission(hunterPerms, PERMISSIONS.HUNTS_EXECUTE)).toBe(true);
    expect(hasPermission(hunterPerms, PERMISSIONS.QUERIES_EXECUTE)).toBe(true);
    expect(hasPermission(hunterPerms, PERMISSIONS.IOCS_OVERRIDE)).toBe(true);
    expect(hasPermission(hunterPerms, PERMISSIONS.SOAR_APPROVE)).toBe(true);
    
    // Hunter cannot manage users/admin by default
    expect(hasPermission(hunterPerms, PERMISSIONS.ADMIN_MANAGE)).toBe(false);
    expect(hasPermission(hunterPerms, PERMISSIONS.USERS_MANAGE)).toBe(false);
  });

  it('should correctly evaluate hasAnyPermission', () => {
    const perms = [PERMISSIONS.IOCS_READ, PERMISSIONS.HUNTS_READ];
    expect(hasAnyPermission(perms, [PERMISSIONS.IOCS_READ, PERMISSIONS.CASES_WRITE])).toBe(true);
    expect(hasAnyPermission(perms, [PERMISSIONS.SOAR_APPROVE, PERMISSIONS.ADMIN_MANAGE])).toBe(false);
  });
});