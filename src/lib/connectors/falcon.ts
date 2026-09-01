import { BaseConnector } from "./base";
import {
  ConnectorProvider,
  ConnectorHealthResult,
  QueryExecutionOptions,
  QueryExecutionResponse,
} from "./types";

/**
 * CrowdStrike Falcon EDR connector via Falcon OAuth2 API.
 * Authenticates with client_credentials flow, then queries
 * the Event Search (RTR / Discover) API.
 */
export class FalconConnector extends BaseConnector {
  provider: ConnectorProvider = "falcon";
  name = "CrowdStrike Falcon (EDR)";

  private readonly FALCON_BASE = "https://api.crowdstrike.com";

  private get clientId(): string {
    return String(this.config.clientId || process.env.CROWDSTRIKE_CLIENT_ID || "");
  }
  private get clientSecret(): string {
    return this.secrets.clientSecret || process.env.CROWDSTRIKE_CLIENT_SECRET || "";
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async validateConfig(
    config: Record<string, unknown>,
    secrets: Record<string, string>
  ): Promise<{ valid: boolean; error?: string }> {
    if (!config.clientId && !process.env.CROWDSTRIKE_CLIENT_ID)
      return { valid: false, error: "CrowdStrike Client ID is required" };
    if (!secrets.clientSecret && !process.env.CROWDSTRIKE_CLIENT_SECRET)
      return { valid: false, error: "CrowdStrike Client Secret is required" };
    return { valid: true };
  }

  /** Obtain CrowdStrike Falcon OAuth2 access token */
  private async getAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(`${this.FALCON_BASE}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`CrowdStrike OAuth2 token request failed: HTTP ${res.status}`);
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
          "CrowdStrike Falcon connector is not configured. Provide Client ID and Client Secret.",
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const start = Date.now();
      await this.getAccessToken();
      const latencyMs = Date.now() - start;

      return {
        status: "HEALTHY",
        latencyMs,
        isDemoData: false,
        message: "Authenticated with CrowdStrike Falcon OAuth2 API successfully.",
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auth failed";
      return {
        status: "UNREACHABLE",
        latencyMs: 0,
        isDemoData: false,
        message: `CrowdStrike Falcon authentication failed: ${msg}`,
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
          "CONNECTOR NOT CONFIGURED: CrowdStrike Falcon credentials are not set. Configure the connector in Security Integrations.",
      };
    }

    try {
      const token = await this.getAccessToken();

      // Use Falcon Spotlight / Event Search via FQL
      const params = new URLSearchParams({
        filter: options.query || "type:'Event_ExternalApiEvent'",
        limit: String(options.maxResults || 100),
      });

      const res = await fetch(
        `${this.FALCON_BASE}/incidents/queries/incidents/v1?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
          errorMessage: `CrowdStrike Falcon query failed: HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const ids: string[] = data.resources || [];

      return {
        success: true,
        provider: this.provider,
        executionTimeMs,
        matchCount: ids.length,
        events: ids.map((id) => ({ incidentId: id })),
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
        errorMessage: `CrowdStrike Falcon query error: ${msg}`,
      };
    }
  }
}
