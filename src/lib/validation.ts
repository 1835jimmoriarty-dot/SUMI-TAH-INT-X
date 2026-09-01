import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({ message: "Valid email is required" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

export const SetupSchema = z.object({
  organizationName: z.string().min(2, { message: "Organization name is required" }),
  adminEmail: z.string().email({ message: "Valid email is required" }),
  adminName: z.string().min(2, { message: "Admin name is required" }),
  adminPassword: z.string().min(10, { message: "Admin password must be at least 10 characters" }),
});

export const HypothesisSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  statement: z.string().min(10, "Statement must describe the hunting hypothesis"),
  rationale: z.string().min(10, "Rationale explaining adversary motivation/behavior is required"),
  status: z.enum(["DRAFT", "IN_PROGRESS", "VALIDATED", "DISPROVEN", "ARCHIVED"]).default("DRAFT"),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  attackTags: z.array(z.string()).optional(),
});

export const HuntSchema = z.object({
  title: z.string().min(3, "Hunt title is required"),
  hypothesisId: z.string().optional().nullable(),
  packageId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  stage: z.enum(["PLANNING", "ACTIVE", "ANALYSIS", "COMPLETED", "CLOSED"]).default("PLANNING"),
  telemetryReq: z.string().optional().nullable(),
  verdict: z.enum(["THREAT_CONFIRMED", "BENIGN_ACTIVITY", "INCONCLUSIVE", "FALSE_POSITIVE"]).optional().nullable(),
  conclusion: z.string().optional().nullable(),
});

export const QuerySchema = z.object({
  title: z.string().min(3, "Query title is required"),
  description: z.string().optional().nullable(),
  siemType: z.enum(["LOGSCALE", "SENTINEL", "SPLUNK", "ELASTIC"]),
  language: z.enum(["LQL", "KQL", "SPL", "EQL"]),
  content: z.string().min(1, "Query string is required"),
  attackTags: z.array(z.string()).optional(),
});

export const QueryExecutionSchema = z.object({
  queryId: z.string().optional().nullable(),
  huntId: z.string().optional().nullable(),
  siemType: z.enum(["LOGSCALE", "SENTINEL", "SPLUNK", "ELASTIC"]),
  rawQuery: z.string().min(1, "Query string is required"),
  timeRange: z.string().default("24h"),
  limit: z.number().int().positive().default(100),
});

export const FindingSchema = z.object({
  huntId: z.string(),
  title: z.string().min(3, "Finding title is required"),
  description: z.string().min(5, "Finding description is required"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.enum(["NEW", "INVESTIGATING", "ESCALATED_TO_CASE", "DISMISSED"]).default("NEW"),
  rawEvent: z.string().optional().nullable(),
});

export const EvidenceSchema = z.object({
  huntId: z.string().optional().nullable(),
  caseId: z.string().optional().nullable(),
  findingId: z.string().optional().nullable(),
  title: z.string().min(2, "Evidence title is required"),
  type: z.enum(["LOG_SNIPPET", "PACKET_CAPTURE", "MEMORY_DUMP", "SCREENSHOT", "REPORT", "IOC_LIST"]),
  content: z.string().min(1, "Evidence content is required"),
  metadata: z.record(z.unknown()).optional(),
});

export const CaseSchema = z.object({
  title: z.string().min(3, "Case title is required"),
  description: z.string().min(10, "Case description is required"),
  huntId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  priority: z.enum(["P1", "P2", "P3", "P4"]).default("P2"),
  status: z.enum(["OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"]).default("OPEN"),
  verdict: z.enum(["TRUE_POSITIVE", "FALSE_POSITIVE", "BENIGN_ACTIVITY"]).optional().nullable(),
  summary: z.string().optional().nullable(),
});

export const IOCOverrideSchema = z.object({
  reputation: z.enum(["MALICIOUS", "HIGH_RISK", "SUSPICIOUS", "UNKNOWN", "BENIGN", "ALLOWLISTED", "CONFLICTING"]),
  reason: z.string().min(5, "Detailed justification is required for reputation overrides"),
});

export const SOARActionRequestSchema = z.object({
  caseId: z.string().optional().nullable(),
  actionType: z.enum(["ISOLATE_HOST", "BLOCK_IP", "SINKHOLE_DOMAIN", "REVOKE_SESSION", "DISABLE_ACCOUNT"]),
  target: z.string().min(1, "Action target is required (IP, Host, Domain, Account)"),
  parameters: z.record(z.unknown()).optional(),
  rationale: z.string().min(10, "Comprehensive security justification is required for SOAR containment actions"),
});

export const SOARActionApprovalSchema = z.object({
  approved: z.boolean(),
  comments: z.string().optional(),
});

export const IntegrationConfigSchema = z.object({
  provider: z.enum(["falcon", "logscale", "sentinel", "splunk", "elastic", "torq"]),
  name: z.string().min(2, "Integration name is required"),
  description: z.string().optional().nullable(),
  isEnabled: z.boolean().default(true),
  config: z.record(z.unknown()),
  secrets: z.record(z.string()).optional(),
});
