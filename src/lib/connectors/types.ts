export type ConnectorProvider = "falcon" | "logscale" | "sentinel" | "splunk" | "elastic" | "torq";

export type HealthState = "HEALTHY" | "DEGRADED" | "UNREACHABLE" | "NOT_CONFIGURED";

export interface ConnectorHealthResult {
  status: HealthState;
  latencyMs: number;
  message: string;
  checkedAt: string;
}

export interface QueryExecutionOptions {
  query: string;
  timeRange?: string;
  limit?: number;
}

export interface QueryResultEvent {
  timestamp: string;
  host?: string;
  user?: string;
  process?: string;
  srcIp?: string;
  destIp?: string;
  action?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface QueryExecutionResponse {
  success: boolean;
  provider: ConnectorProvider;
  executionTimeMs: number;
  matchCount: number;
  events: QueryResultEvent[];
  isDemoData: boolean;
  errorMessage?: string;
}

export interface IConnector {
  provider: ConnectorProvider;
  name: string;
  isConfigured(): boolean;
  health(): Promise<ConnectorHealthResult>;
  validateConfig(config: Record<string, unknown>, secrets: Record<string, string>): Promise<{ valid: boolean; error?: string }>;
  execute(options: QueryExecutionOptions): Promise<QueryExecutionResponse>;
}
