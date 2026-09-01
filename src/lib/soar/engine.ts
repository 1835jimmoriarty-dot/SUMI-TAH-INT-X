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
    throw new Error(`SOAR action ${params.actionId} not found`);
  }

  if (action.status !== "PENDING_APPROVAL") {
    throw new Error(`Cannot approve action in status ${action.status}`);
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
        action: `SOAR Containment: ${action.actionType} (${finalStatus})`,
        details: `Action against '${action.target}'. Result: ${logMessage}`,
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
    executedAt: executionTimestamp.toISOString(),
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
      executionLog: `Action rejected by analyst. Reason: ${params.reason}`,
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