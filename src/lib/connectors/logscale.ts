import { BaseConnector } from "./base";
import {
  ConnectorProvider,
  ConnectorHealthResult,
  QueryExecutionOptions,
  QueryExecutionResponse,
} from "./types";

export class LogScaleConnector extends BaseConnector {
  provider: ConnectorProvider = "logscale";
  name = "Falcon LogScale (Humio)";

  private get apiKey(): string {
    return this.secrets.apiKey || process.env.LOGSCALE_API_KEY || "";
  }

  isConfigured(): boolean {
    return Boolean(this.config.baseUrl && this.apiKey);
  }

  async validateConfig(
    config: Record<string, unknown>,
    secrets: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    if (!config.baseUrl)
      return { valid: false, error: "LogScale Base URL is required" };
    if (!secrets.apiKey && !process.env.LOGSCALE_API_KEY)
      return { valid: false, error: "LogScale API Key is required" };
    return { valid: true };
  }

  async health(): Promise<ConnectorHealthResult> {
    if (!this.isConfigured()) {
      return {
        status: "NOT_CONFIGURED",
        latencyMs: 0,
        isDemoData: true,
        message:
          "LogScale connector is not configured. Provide repository URL and API key in Security Integrations.",
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const start = Date.now();
      const res = await fetch(
        `${this.config.baseUrl}/api/v1/repositories`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          status: "UNREACHABLE",
          latencyMs,
          isDemoData: false,
          message: `LogScale returned HTTP ${res.status}: ${res.statusText}`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: "HEALTHY",
        latencyMs,
        isDemoData: false,
        message: "Connected to Falcon LogScale repository successfully.",
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return {
        status: "UNREACHABLE",
        latencyMs: 0,
        isDemoData: false,
        message: `Failed to communicate with LogScale: ${msg}`,
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
          "CONNECTOR NOT CONFIGURED: Falcon LogScale credentials are not set. Configure the connector in Security Integrations.",
      };
    }

    try {
      const body = JSON.stringify({
        queryString: options.query,
        start: options.startTime || "24h",
        end: options.endTime || "now",
        isLive: false,
      });

      const res = await fetch(
        `${this.config.baseUrl}/api/v1/repositories/${this.config.repository || "hunt"}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body,
          signal: AbortSignal.timeout(30000),
        }
      );

      const executionTimeMs = Date.now() - start;

      if (!res.ok) {
        return {
          success: false,
          provider: this.provider,
          executionTimeMs,
          matchCount: 0,
          events: [],
          isDemoData: false,
          errorMessage: `LogScale query failed with HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      const events = Array.isArray(data) ? data : data.events || [];

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
        errorMessage: `LogScale query error: ${msg}`,
      };
    }
  }
}
