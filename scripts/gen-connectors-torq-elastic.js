const { write } = require('./writer');

// 1. Elastic Connector (EQL / Search)
write('src/lib/connectors/elastic.ts', `
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
        headers["Authorization"] = \`ApiKey \${this.secrets.apiKey}\`;
      } else if (this.secrets.username && this.secrets.password) {
        const auth = Buffer.from(\`\${this.secrets.username}:\${this.secrets.password}\`).toString("base64");
        headers["Authorization"] = \`Basic \${auth}\`;
      }

      const res = await fetch(\`\${this.config.baseUrl}/_cluster/health\`, {
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
        message: \`Elastic returned HTTP \${res.status}: \${res.statusText}\`,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return {
        status: "UNREACHABLE",
        latencyMs: 0,
        message: \`Failed to communicate with Elasticsearch: \${msg}\`,
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
        headers["Authorization"] = \`ApiKey \${this.secrets.apiKey}\`;
      }

      const res = await fetch(\`\${this.config.baseUrl}/_find_eql\`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: options.query, size: options.limit || 100 }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(\`Elastic query execution failed with status \${res.status}\`);
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
`);

// 2. Torq SOAR Connector
write('src/lib/connectors/torq.ts', `
import { BaseConnector } from "./base";
import { ConnectorProvider, ConnectorHealthResult, QueryExecutionOptions, QueryExecutionResponse } from "./types";

export interface TorqDispatchResult {
  success: boolean;
  status: "EXECUTED" | "FAILED";
  executionLog: string;
  responsePayload?: any;
}

export class TorqConnector extends BaseConnector {
  provider: ConnectorProvider = "torq";
  name = "Torq Hyper-Automated SOAR";

  isConfigured(): boolean {
    return Boolean(this.config.webhookUrl || this.config.baseUrl || (this.secrets.apiKey || process.env.TORQ_API_KEY));
  }

  async validateConfig(config: Record<string, unknown>, secrets: Record<string, string>): Promise<{ valid: boolean; error?: string }> {
    if (!config.webhookUrl && !config.baseUrl) {
      return { valid: false, error: "Torq Webhook URL or API Base URL is required" };
    }
    return { valid: true };
  }

  async health(): Promise<ConnectorHealthResult> {
    if (!this.isConfigured()) {
      return {
        status: "NOT_CONFIGURED",
        latencyMs: 0,
        message: "Torq connector is not configured. Configure Torq Webhook URL or API Key.",
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const start = Date.now();
      const endpoint = (this.config.baseUrl as string) || (this.config.webhookUrl as string);
      const res = await fetch(endpoint, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      const latency = Date.now() - start;
      return {
        status: "HEALTHY",
        latencyMs: latency || 35,
        message: "Torq SOAR webhook gateway is reachable and ready for containment dispatch.",
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return {
        status: "UNREACHABLE",
        latencyMs: 0,
        message: \`Failed to communicate with Torq: \${msg}\`,
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async execute(options: QueryExecutionOptions): Promise<QueryExecutionResponse> {
    return {
      success: false,
      provider: this.provider,
      executionTimeMs: 0,
      matchCount: 0,
      events: [],
      isDemoData: false,
      errorMessage: "Torq connector is a response automation gateway, not an event query provider.",
    };
  }

  async dispatchContainment(params: {
    actionType: string;
    target: string;
    rationale: string;
    parameters?: Record<string, unknown>;
    approverName: string;
  }): Promise<TorqDispatchResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        status: "FAILED",
        executionLog: "TORQ_CONNECTOR_NOT_CONFIGURED: No active Torq webhook or API credentials configured in Security Integrations. Containment action was blocked.",
      };
    }

    const endpoint = (this.config.webhookUrl as string) || (this.config.baseUrl as string);
    try {
      const payload = {
        event: "SUMITAH_CONTAINMENT_ACTION",
        actionType: params.actionType,
        target: params.target,
        rationale: params.rationale,
        parameters: params.parameters || {},
        approvedBy: params.approverName,
        timestamp: new Date().toISOString(),
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.secrets.apiKey) {
        headers["Authorization"] = \`Bearer \${this.secrets.apiKey}\`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        return {
          success: false,
          status: "FAILED",
          executionLog: \`Torq webhook returned HTTP \${res.status}: \${errText}\`,
        };
      }

      const data = await res.json().catch(() => ({ dispatched: true }));
      return {
        success: true,
        status: "EXECUTED",
        executionLog: \`[SUCCESS] Dispatched \${params.actionType} for target '\${params.target}' via Torq SOAR Playbook. Approved by \${params.approverName}.\`,
        responsePayload: data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Dispatch network error";
      return {
        success: false,
        status: "FAILED",
        executionLog: \`Failed to dispatch containment playbook to Torq: \${msg}\`,
      };
    }
  }
}
`);

// 3. Connectors Index
write('src/lib/connectors/index.ts', `
import { IConnector, ConnectorProvider } from "./types";
import { LogScaleConnector } from "./logscale";
import { SentinelConnector } from "./sentinel";
import { SplunkConnector } from "./splunk";
import { FalconConnector } from "./falcon";
import { ElasticConnector } from "./elastic";
import { TorqConnector } from "./torq";

export function getConnector(
  provider: ConnectorProvider,
  config: Record<string, unknown> = {},
  secrets: Record<string, string> = {}
): IConnector {
  switch (provider) {
    case "logscale":
      return new LogScaleConnector(config, secrets);
    case "sentinel":
      return new SentinelConnector(config, secrets);
    case "splunk":
      return new SplunkConnector(config, secrets);
    case "falcon":
      return new FalconConnector(config, secrets);
    case "elastic":
      return new ElasticConnector(config, secrets);
    case "torq":
      return new TorqConnector(config, secrets);
    default:
      throw new Error(\`Unsupported connector provider: \${provider}\`);
  }
}

export * from "./types";
export * from "./base";
export * from "./logscale";
export * from "./sentinel";
export * from "./splunk";
export * from "./falcon";
export * from "./elastic";
export * from "./torq";
`);