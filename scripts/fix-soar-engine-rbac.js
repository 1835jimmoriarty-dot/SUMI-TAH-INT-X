const { write } = require('./writer');

// 1. Fixed SOAR Engine
write('src/lib/soar/engine.ts', `
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { SOARActionRequest, SOARActionExecutionResult } from "./types";
import { TorqConnector } from "@/lib/connectors/torq";
import { decryptSecret } from "@/lib/encryption";

export async function requestSOARAction(params: SOARActionRequest): Promise<string> {
  const action = await prisma.sOARAction.create({
    data: {
      caseId: params.caseId,
      actionType: params.actionType,
      target: params.target,
      parameters: params.parameters ? JSON.stringify(params.parameters) : null,
      rationale: params.rationale,
      status: "PENDING_APPROVAL",
      requesterId: params.requesterId,
    },
  });

  await createAuditLog({
    action: "SOAR_ACTION_REQUESTED",
    resource: "SOARAction",
    resourceId: action.id,
    userId: params.requesterId,
    details: {
      actionType: params.actionType,
      target: params.target,
      rationale: params.rationale,
      caseId: params.caseId,
    },
  });

  return action.id;
}

export async function approveAndExecuteSOARAction(params: {
  actionId: string;
  approverId: string;
  approverName: string;
  comments?: string;
}): Promise<SOARActionExecutionResult> {
  const action = await prisma.sOARAction.findUnique({
    where: { id: params.actionId },
    include: { requester: true },
  });

  if (!action) {
    throw new Error(\`SOAR action \${params.actionId} not found\`);
  }

  if (action.status !== "PENDING_APPROVAL") {
    throw new Error(\`Cannot approve action in status \${action.status}\`);
  }

  // ENFORCE SEPARATION OF DUTIES: Requester cannot approve their own containment action
  if (action.requesterId === params.approverId) {
    throw new Error("Separation of duties violation: An analyst cannot approve their own containment action. An independent authorized approver is required.");
  }

  // Retrieve Torq Integration settings for the organization if available
  const integration = await prisma.integration.findFirst({
    where: {
      provider: "torq",
      isEnabled: true,
      orgId: action.requester.orgId,
    },
    include: { secrets: true },
  });

  let config: Record<string, unknown> = {};
  let secrets: Record<string, string> = {};

  if (integration) {
    try {
      config = JSON.parse(integration.configJson);
      integration.secrets.forEach((s) => {
        secrets[s.keyName] = decryptSecret({
          encryptedData: s.encryptedData,
          iv: s.iv,
          authTag: s.authTag,
        });
      });
    } catch (err) {
      console.error("Failed to decrypt Torq secrets:", err);
    }
  } else if (process.env.TORQ_WEBHOOK_URL) {
    config = { webhookUrl: process.env.TORQ_WEBHOOK_URL };
    if (process.env.TORQ_API_KEY) secrets = { apiKey: process.env.TORQ_API_KEY };
  }

  const torqConnector = new TorqConnector(config, secrets);
  let parsedParams = {};
  if (action.parameters) {
    try { parsedParams = JSON.parse(action.parameters); } catch {}
  }

  // Execute real containment dispatch via Torq provider
  const dispatchResult = await torqConnector.dispatchContainment({
    actionType: action.actionType,
    target: action.target,
    rationale: action.rationale,
    parameters: parsedParams,
    approverName: params.approverName,
  });

  const executionTimestamp = new Date();
  const finalStatus = dispatchResult.success ? "EXECUTED" : "FAILED";
  const logMessage = dispatchResult.executionLog;

  const updated = await prisma.sOARAction.update({
    where: { id: params.actionId },
    data: {
      status: finalStatus,
      approverId: params.approverId,
      approvedAt: executionTimestamp,
      executedAt: dispatchResult.success ? executionTimestamp : null,
      executionLog: logMessage,
    },
  });

  if (action.caseId) {
    await prisma.caseAction.create({
      data: {
        caseId: action.caseId,
        actorName: params.approverName,
        action: \`SOAR Containment: \${action.actionType} (\${finalStatus})\`,
        details: \`Action against '\${action.target}'. Result: \${logMessage}\`,
      },
    });
  }

  await createAuditLog({
    action: dispatchResult.success ? "SOAR_ACTION_APPROVED_AND_EXECUTED" : "SOAR_ACTION_EXECUTION_FAILED",
    resource: "SOARAction",
    resourceId: action.id,
    userId: params.approverId,
    details: {
      actionType: action.actionType,
      target: action.target,
      approverId: params.approverId,
      status: finalStatus,
      executionLog: logMessage,
    },
  });

  return {
    actionId: updated.id,
    status: finalStatus,
    executionLog: logMessage,
    executedAt: dispatchResult.success ? executionTimestamp.toISOString() : undefined,
  };
}

export async function rejectSOARAction(params: {
  actionId: string;
  approverId: string;
  reason: string;
}): Promise<void> {
  const action = await prisma.sOARAction.findUnique({
    where: { id: params.actionId },
  });

  if (!action || action.status !== "PENDING_APPROVAL") {
    throw new Error("Action is not in pending approval status");
  }

  if (action.requesterId === params.approverId) {
    throw new Error("Separation of duties violation: An analyst cannot reject/approve their own containment action.");
  }

  await prisma.sOARAction.update({
    where: { id: params.actionId },
    data: {
      status: "REJECTED",
      approverId: params.approverId,
      executionLog: \`Action rejected by analyst. Reason: \${params.reason}\`,
    },
  });

  await createAuditLog({
    action: "SOAR_ACTION_REJECTED",
    resource: "SOARAction",
    resourceId: action.id,
    userId: params.approverId,
    details: {
      actionType: action.actionType,
      target: action.target,
      reason: params.reason,
    },
  });
}
`);

// 2. Fixed SOAR Approve Route
write('src/app/api/soar/actions/[id]/approve/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { SOARActionApprovalSchema } from "@/lib/validation";
import { approveAndExecuteSOARAction, rejectSOARAction } from "@/lib/soar";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_APPROVE)) {
    return NextResponse.json({ error: "Unauthorized: SOAR Approval permission required" }, { status: 403 });
  }

  const action = await prisma.sOARAction.findUnique({
    where: { id: params.id },
    include: { requester: true },
  });

  if (!action) {
    return NextResponse.json({ error: "SOAR action not found" }, { status: 404 });
  }

  // Multi-tenant check
  if (action.requester.orgId !== session.orgId) {
    return NextResponse.json({ error: "Unauthorized: Resource belongs to another organization" }, { status: 403 });
  }

  // Enforce Separation of Duties
  if (action.requesterId === session.userId) {
    return NextResponse.json({
      error: "Separation of duties violation: An analyst cannot approve their own containment action. An independent authorized approver is required.",
    }, { status: 403 });
  }

  const body = await req.json();
  const validated = SOARActionApprovalSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid approval payload", details: validated.error.format() }, { status: 400 });
  }

  if (validated.data.approved) {
    const result = await approveAndExecuteSOARAction({
      actionId: params.id,
      approverId: session.userId,
      approverName: session.name,
      comments: validated.data.comments,
    });
    return NextResponse.json({ success: true, ...result });
  } else {
    await rejectSOARAction({
      actionId: params.id,
      approverId: session.userId,
      reason: validated.data.comments || "Rejected by security analyst",
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }
}
`);

// 3. Fixed RBAC with Separation of Duties
write('src/lib/rbac.ts', `
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
    // Note: LEAD_HUNTER does NOT have SOAR_APPROVE — enforcing separation of duties
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
`);