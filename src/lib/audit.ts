import prisma from "@/lib/db";

interface AuditLogParams {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  orgId?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: "SUCCESS" | "FAILURE" | "DENIED";
  details?: Record<string, unknown>;
}

const REDACTED_KEYS = [
  "password",
  "pass",
  "hash",
  "secret",
  "token",
  "key",
  "authorization",
  "apikey",
  "credential",
  "encrypteddata",
];

function sanitizeAuditDetails(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeAuditDetails);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = REDACTED_KEYS.some((sensitive) => lowerKey.includes(sensitive));

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeAuditDetails(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const sanitizedDetails = params.details
      ? JSON.stringify(sanitizeAuditDetails(params.details))
      : null;

    await prisma.auditLog.create({
      data: {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        userId: params.userId,
        orgId: params.orgId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: params.status || "SUCCESS",
        details: sanitizedDetails,
      },
    });
  } catch (error) {
    // Failsafe: Never crash application due to audit logging failure, but log to stderr
    console.error("Failed to write audit log:", error);
  }
}
