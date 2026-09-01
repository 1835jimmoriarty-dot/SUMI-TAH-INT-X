import { BaseConnector } from "./base";
import {
  ConnectorProvider,
  ConnectorHealthResult,
  QueryExecutionOptions,
  QueryExecutionResponse,
} from "./types";

/**
 * Splunk Enterprise / Cloud connector via Splunk REST API.
 * Uses the /services/search/jobs endpoint for SPL query execution.
 */
export class SplunkConnector extends BaseConnector {
  provider: ConnectorProvider = "splunk";
  name = "Splunk Enterprise / Cloud (SPL)";

  private get baseUrl(): string {
    return String(this.config.baseUrl || process.env.SPLUNK_BASE_URL || "");
  }
  private get token(): string {
    return this.secrets.token || process.env.SPLUNK_HEC_TOKEN || "";
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  async validateConfig(
    config: Record<string, unknown>,
    secrets: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    if (!config.baseUrl)
      return { valid: false, error: "Splunk Base URL is required" };
    if (!secrets.token && !process.env.SPLUNK_HEC_TOKEN)
      return { valid: false, error: "Splunk Bearer Token is required" };
    return { valid: true };
  }

  async health(): Promise<ConnectorHealthResult> {
    if (!this.isConfigured()) {
      return {
        status: "NOT_CONFIGURED",
        latencyMs: 0,
        isDemoData: true,
        message:
          "Splunk connector is not configured. Provide REST API URL and authentication token.",
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const start = Date.now();
      const res = await fetch(`${this.baseUrl}/services/server/info?output_mode=json`, {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          status: "UNREACHABLE",
          latencyMs,
          isDemoData: false,
          message: `Splunk returned HTTP ${res.status}: ${res.statusText}`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: "HEALTHY",
        latencyMs,
        isDemoData: false,
        message: "Connected to Splunk REST API successfully.",
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return {
        status: "UNREACHABLE",
        latencyMs: 0,
        isDemoData: false,
        message: `Failed to communicate with Splunk: ${msg}`,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async execute(options: QueryExecutionOptions): Promise<QueryExecutionResponse> {
    const start = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.provider,
        executionTimeMs: Date.now() - start,
        matchCount: 0,
        events: [],
        isDemoData: false,
        errorMessage:
          "CONNECTOR NOT CONFIGURED: Splunk REST credentials are not set. Configure the connector in Security Integrations.",
      };
    }

    try {
      // Step 1: Create a search job
      const jobBody = new URLSearchParams({
        search: `search ${options.query}`,
        output_mode: "json",
        exec_mode: "oneshot",
        earliest_time: options.startTime || "-24h",
        latest_time: options.endTime || "now",
        count: String(options.maxResults || 1000),
      });

      const jobRes = await fetch(`${this.baseUrl}/services/search/jobs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: jobBody,
        signal: AbortSignal.timeout(30000),
      });

      const executionTimeMs = Date.now() - start;

      if (!jobRes.ok) {
        return {
          success: false,
          provider: this.provider,
          executionTimeMs,
          matchCount: 0,
          events: [],
          isDemoData: false,
          errorMessage: `Splunk search job failed: HTTP ${jobRes.status}`,
        };
      }

      const data = await jobRes.json();
      const events: any[] = data.results || [];

      return {
        success: true,
        provider: this.provider,
        executionTimeMs,
        matchCount: events.length,
        events,
        isDemoData: false,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Query failed";
      return {
        success: false,
        provider: this.provider,
        executionTimeMs: Date.now() - start,
        matchCount: 0,
        events: [],
        isDemoData: false,
        errorMessage: `Splunk query error: ${msg}`,
      };
    }
  }
}
