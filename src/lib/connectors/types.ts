export type ConnectorProvider =
  | "falcon"
  | "logscale"
  | "sentinel"
  | "splunk"
  | "elastic"
  | "torq";

export type HealthState =
  | "HEALTHY"
  | "DEGRADED"
  | "UNREACHABLE"
  | "NOT_CONFIGURED"
  | "DEMO_SIMULATION";

export interface ConnectorHealthResult {
  status: HealthState;
  latencyMs: number;
  message: string;
  checkedAt: string;
  /** True when connector is unconfigured and returning simulated/demo results */
  isDemoData?: boolean;
}

export interface QueryExecutionOptions {
  query: string;
  timeRange?: string;
  limit?: number;
  /** ISO8601 or relative time string (e.g. "-24h") */
  startTime?: string;
  /** ISO8601 or relative time string (e.g. "now") */
  endTime?: string;
  /** Maximum number of results to return */
  maxResults?: number;
}

export interface QueryResultEvent {
  timestamp?: string;
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
  validateConfig(
    config: Record<string, unknown>,
    secrets: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }>;
  execute(options: QueryExecutionOptions): Promise<QueryExecutionResponse>;
}
