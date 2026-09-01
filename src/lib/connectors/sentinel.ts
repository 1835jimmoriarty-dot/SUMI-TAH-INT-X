import { BaseConnector } from "./base";
import {
  ConnectorProvider,
  ConnectorHealthResult,
  QueryExecutionOptions,
  QueryExecutionResponse,
} from "./types";

/**
 * Microsoft Sentinel connector via Azure Log Analytics REST API.
 * Uses OAuth2 client_credentials flow to obtain a bearer token,
 * then runs KQL queries against the Log Analytics workspace.
 */
export class SentinelConnector extends BaseConnector {
  provider: ConnectorProvider = "sentinel";
  name = "Microsoft Sentinel (KQL)";

  private get tenantId(): string {
    return String(this.config.tenantId || process.env.SENTINEL_TENANT_ID || "");
  }
  private get clientId(): string {
    return String(this.config.clientId || process.env.SENTINEL_CLIENT_ID || "");
  }
  private get clientSecret(): string {
    return this.secrets.clientSecret || process.env.SENTINEL_CLIENT_SECRET || "";
  }
  private get workspaceId(): string {
    return String(
      this.config.workspaceId || process.env.SENTINEL_WORKSPACE_ID || ""
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.workspaceId && this.tenantId && this.clientId && this.clientSecret
    );
  }

  async validateConfig(
    config: Record<string, unknown>,
    secrets: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    if (!config.workspaceId)
      return { valid: false, error: "Sentinel Log Analytics Workspace ID is required" };
    if (!config.tenantId)
      return { valid: false, error: "Azure Tenant ID is required" };
    if (!config.clientId)
      return { valid: false, error: "Azure Client ID is required" };
    if (!secrets.clientSecret && !process.env.SENTINEL_CLIENT_SECRET)
      return { valid: false, error: "Azure Client Secret is required" };
    return { valid: true };
  }

  /** Obtain an Azure AD OAuth2 access token */
  private async getAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: "https://api.loganalytics.io/.default",
    });

    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      throw new Error(`Azure AD token request failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.access_token as string;
  }

  async health(): Promise<ConnectorHealthResult> {
    if (!this.isConfigured()) {
      return {
        status: "NOT_CONFIGURED",
        latencyMs: 0,
        isDemoData: true,
        message:
          "Microsoft Sentinel connector is not configured. Provide Workspace ID, Tenant ID, Client ID, and Client Secret.",
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const start = Date.now();
      const token = await this.getAccessToken();
      // Lightweight heartbeat query
      const res = await fetch(
        `https://api.loganalytics.io/v1/workspaces/${this.workspaceId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: "SecurityEvent | take 1" }),
          signal: AbortSignal.timeout(8000),
        }
      );
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          status: "UNREACHABLE",
          latencyMs,
          isDemoData: false,
          message: `Sentinel returned HTTP ${res.status}: ${res.statusText}`,
          checkedAt: new Date().toISOString(),
        };
      }

      return {
        status: "HEALTHY",
        latencyMs,
        isDemoData: false,
        message: "Connected to Microsoft Sentinel workspace successfully.",
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      return {
        status: "UNREACHABLE",
        latencyMs: 0,
        isDemoData: false,
        message: `Failed to communicate with Microsoft Sentinel: ${msg}`,
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
          "CONNECTOR NOT CONFIGURED: Microsoft Sentinel credentials are not set. Configure the connector in Security Integrations.",
      };
    }

    try {
      const token = await this.getAccessToken();
      const res = await fetch(
        `https://api.loganalytics.io/v1/workspaces/${this.workspaceId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: options.query }),
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
          errorMessage: `Sentinel KQL query failed: HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      // Log Analytics response: { tables: [{ name, columns, rows }] }
      const table = data.tables?.[0];
      const events: any[] = [];
      if (table?.rows && table?.columns) {
        const cols: string[] = table.columns.map((c: any) => c.name);
        for (const row of table.rows) {
          const event: Record<string, any> = {};
          cols.forEach((col, i) => (event[col] = row[i]));
          events.push(event);
        }
      }

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
        errorMessage: `Sentinel query error: ${msg}`,
      };
    }
  }
}
