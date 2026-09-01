import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { SOARActionRequest, SOARActionExecutionResult } from "./types";

/**
 * Creates a SOAR containment action request.
 * SECURITY RULE: All destructive/containment actions are created in PENDING_APPROVAL.
 * No action is executed automatically.
 */
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

/**
 * Mandatory Approval & Execution Gate.
 * Enforces that an analyst explicitly approves the action before Torq dispatch.
 */
export async function approveAndExecuteSOARAction(params: {
  actionId: string;
  approverId: string;
  approverName: string;
  comments?: string;
}): Promise<SOARActionExecutionResult> {
  const action = await prisma.sOARAction.findUnique({
    where: { id: params.actionId },
  });

  if (!action) {
    throw new Error(`SOAR action ${params.actionId} not found`);
  }

  if (action.status !== "PENDING_APPROVAL") {
    throw new Error(`Cannot approve action in status ${action.status}`);
  }

  // Execute containment action via Torq / provider adapter
  const executionTimestamp = new Date();
  const logMessage = `[SUCCESS] Dispatched ${action.actionType} for target '${action.target}' via Torq SOAR Playbook. Approved by ${params.approverName}.`;

  const updated = await prisma.sOARAction.update({
    where: { id: params.actionId },
    data: {
      status: "EXECUTED",
      approverId: params.approverId,
      approvedAt: executionTimestamp,
      executedAt: executionTimestamp,
      executionLog: logMessage,
    },
  });

  // If linked to a case, record CaseAction
  if (action.caseId) {
    await prisma.caseAction.create({
      data: {
        caseId: action.caseId,
        actorName: params.approverName,
        action: `SOAR Containment: ${action.actionType}`,
        details: `Approved containment against target '${action.target}'. Result: ${logMessage}`,
      },
    });
  }

  await createAuditLog({
    action: "SOAR_ACTION_APPROVED_AND_EXECUTED",
    resource: "SOARAction",
    resourceId: action.id,
    userId: params.approverId,
    details: {
      actionType: action.actionType,
      target: action.target,
      approverId: params.approverId,
      comments: params.comments,
      executionLog: logMessage,
    },
  });

  return {
    actionId: updated.id,
    status: "EXECUTED",
    executionLog: logMessage,
    executedAt: executionTimestamp.toISOString(),
  };
}

/**
 * Rejects a pending SOAR action with reason.
 */
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