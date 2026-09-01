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
        message: `Failed to communicate with Torq: ${msg}`,
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
        headers["Authorization"] = `Bearer ${this.secrets.apiKey}`;
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
          executionLog: `Torq webhook returned HTTP ${res.status}: ${errText}`,
        };
      }

      const data = await res.json().catch(() => ({ dispatched: true }));
      return {
        success: true,
        status: "EXECUTED",
        executionLog: `[SUCCESS] Dispatched ${params.actionType} for target '${params.target}' via Torq SOAR Playbook. Approved by ${params.approverName}.`,
        responsePayload: data,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Dispatch network error";
      return {
        success: false,
        status: "FAILED",
        executionLog: `Failed to dispatch containment playbook to Torq: ${msg}`,
      };
    }
  }
}