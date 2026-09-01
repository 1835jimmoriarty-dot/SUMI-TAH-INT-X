export const PERMISSIONS = {
  // Cases
  CASES_READ: "cases:read",
  CASES_WRITE: "cases:write",
  CASES_DELETE: "cases:delete",

  // Hunts & Hypotheses
  HUNTS_READ: "hunts:read",
  HUNTS_WRITE: "hunts:write",
  HUNTS_EXECUTE: "hunts:execute",
  HYPOTHESES_READ: "hypotheses:read",
  HYPOTHESES_WRITE: "hypotheses:write",

  // Queries
  QUERIES_READ: "queries:read",
  QUERIES_WRITE: "queries:write",
  QUERIES_EXECUTE: "queries:execute",

  // Evidence
  EVIDENCE_READ: "evidence:read",
  EVIDENCE_WRITE: "evidence:write",

  // IOCs & Intel
  IOCS_READ: "iocs:read",
  IOCS_WRITE: "iocs:write",
  IOCS_IMPORT: "iocs:import",
  IOCS_OVERRIDE: "iocs:override",
  INTEL_READ: "intel:read",
  INTEL_WRITE: "intel:write",

  // MITRE & Coverage
  MITRE_READ: "mitre:read",
  MITRE_EXPORT: "mitre:export",
  COVERAGE_READ: "coverage:read",

  // Integrations & SOAR
  INTEGRATIONS_READ: "integrations:read",
  INTEGRATIONS_MANAGE: "integrations:manage",
  SOAR_READ: "soar:read",
  SOAR_REQUEST: "soar:request",
  SOAR_APPROVE: "soar:approve",

  // Reports, Audit & Admin
  REPORTS_READ: "reports:read",
  REPORTS_GENERATE: "reports:generate",
  AUDIT_READ: "audit:read",
  ADMIN_MANAGE: "admin:manage",
  USERS_MANAGE: "users:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLES = {
  SECURITY_ADMIN: "SECURITY_ADMIN",
  LEAD_HUNTER: "LEAD_HUNTER",
} as const;

export const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  [SYSTEM_ROLES.SECURITY_ADMIN]: Object.values(PERMISSIONS),
  [SYSTEM_ROLES.LEAD_HUNTER]: [
    PERMISSIONS.CASES_READ,
    PERMISSIONS.CASES_WRITE,
    PERMISSIONS.HUNTS_READ,
    PERMISSIONS.HUNTS_WRITE,
    PERMISSIONS.HUNTS_EXECUTE,
    PERMISSIONS.HYPOTHESES_READ,
    PERMISSIONS.HYPOTHESES_WRITE,
    PERMISSIONS.QUERIES_READ,
    PERMISSIONS.QUERIES_WRITE,
    PERMISSIONS.QUERIES_EXECUTE,
    PERMISSIONS.EVIDENCE_READ,
    PERMISSIONS.EVIDENCE_WRITE,
    PERMISSIONS.IOCS_READ,
    PERMISSIONS.IOCS_WRITE,
    PERMISSIONS.IOCS_IMPORT,
    PERMISSIONS.IOCS_OVERRIDE,
    PERMISSIONS.INTEL_READ,
    PERMISSIONS.INTEL_WRITE,
    PERMISSIONS.MITRE_READ,
    PERMISSIONS.MITRE_EXPORT,
    PERMISSIONS.COVERAGE_READ,
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.SOAR_READ,
    PERMISSIONS.SOAR_REQUEST,
    PERMISSIONS.SOAR_APPROVE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.AUDIT_READ,
  ],
};

export function hasPermission(userPermissions: string[], required: string): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes(PERMISSIONS.ADMIN_MANAGE)) return true;
  return userPermissions.includes(required);
}

export function hasAnyPermission(userPermissions: string[], requiredList: string[]): boolean {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (userPermissions.includes(PERMISSIONS.ADMIN_MANAGE)) return true;
  return requiredList.some((perm) => userPermissions.includes(perm));
}
