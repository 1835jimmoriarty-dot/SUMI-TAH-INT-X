export type SOARActionType =
  | "ISOLATE_HOST"
  | "BLOCK_IP"
  | "SINKHOLE_DOMAIN"
  | "REVOKE_SESSION"
  | "DISABLE_ACCOUNT";

export type SOARActionStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTED"
  | "FAILED";

export interface SOARActionRequest {
  caseId?: string;
  actionType: SOARActionType;
  target: string;
  parameters?: Record<string, unknown>;
  rationale: string;
  requesterId: string;
}

export interface SOARActionExecutionResult {
  actionId: string;
  status: SOARActionStatus;
  executionLog: string;
  executedAt: string;
}