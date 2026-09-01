import { BaseConnector } from "./base";
import { ConnectorProvider, ConnectorHealthResult, QueryExecutionOptions, QueryExecutionResponse } from "./types";

export class ElasticConnector extends BaseConnector {
  provider: ConnectorProvider = "elastic";
  name = "Elasticsearch / Elastic Security";

  isConfigured(): boolean {
    return Boolean(this.config.baseUrl && (this.secrets.apiKey || this.secrets.password || process.env.ELASTIC_API_KEY));
  }

  async validateConfig(config: Record<string, unknown>, secrets: Record<string, string>): Promise<{ valid: boolean; error?: string }> {
    if (!config.baseUrl) return { valid: false, error: "Elasticsearch Base URL is required (e.g. https://elastic.internal:9200)" };
    if (!secrets.apiKey && !secrets.password && !process.env.ELASTIC_API_KEY) {
      return { valid: false, error: "Elastic API Key or Password is required" };
    }
    return { valid: true };
  }

  async health(): Promise<ConnectorHealthResult> {
    if (!this.isConfigured()) {
      return {
        status: "NOT_CONFIGURED",
        latencyMs: 0,
        message: "Elastic connector is not configured. Configure Elasticsearch cluster URL and API key.",
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const start = Date.now();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.secrets.apiKey) {
        headers["Authorization"] = `ApiKey ${this.secrets.apiKey}`;
      } else if (this.secrets.username && this.secrets.password) {
        const auth = Buffer.from(`${this.secrets.username}:${this.secrets.password}`).toString("base64");
        headers["Authorization"] = `Basic ${auth}`;
      }

      const res = await fetch(`${this.config.baseUrl}/_cluster/health`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - start;
      if (res.ok) {
        return {
          status: "HEALTHY",
          latencyMs: latency,
          message: "Connected to Elasticsearch cluster successfully.",
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: "DEGRADED",
        latencyMs: latency,
        message: `Elastic returned HTTP ${res.status}: ${res.statusText}`,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return {
        status: "UNREACHABLE",
        latencyMs: 0,
        message: `Failed to communicate with Elasticsearch: ${msg}`,
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
        errorMessage: "CONNECTOR NOT CONFIGURED: Elasticsearch credentials are not configured. Please configure the connector in Security Integrations.",
      };
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.secrets.apiKey) {
        headers["Authorization"] = `ApiKey ${this.secrets.apiKey}`;
      }

      const res = await fetch(`${this.config.baseUrl}/_find_eql`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: options.query, size: options.limit || 100 }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`Elastic query execution failed with status ${res.status}`);
      }

      const data = await res.json();
      const hits = data.hits?.events || data.hits?.hits || [];
      return {
        success: true,
        provider: this.provider,
        executionTimeMs: Date.now() - start,
        matchCount: hits.length,
        events: hits.map((h: any) => h._source || h),
        isDemoData: false,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Query execution failed";
      return {
        success: false,
        provider: this.provider,
        executionTimeMs: Date.now() - start,
        matchCount: 0,
        events: [],
        isDemoData: false,
        errorMessage: msg,
      };
    }
  }
}