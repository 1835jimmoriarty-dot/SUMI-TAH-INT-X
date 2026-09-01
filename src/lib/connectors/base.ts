import { IConnector, ConnectorProvider, ConnectorHealthResult, QueryExecutionOptions, QueryExecutionResponse } from "./types";

export abstract class BaseConnector implements IConnector {
  abstract provider: ConnectorProvider;
  abstract name: string;
  protected config: Record<string, unknown>;
  protected secrets: Record<string, string>;

  constructor(config: Record<string, unknown> = {}, secrets: Record<string, string> = {}) {
    this.config = config;
    this.secrets = secrets;
  }

  abstract isConfigured(): boolean;
  abstract health(): Promise<ConnectorHealthResult>;
  abstract validateConfig(config: Record<string, unknown>, secrets: Record<string, string>): Promise<{ valid: boolean; error?: string }>;
  abstract execute(options: QueryExecutionOptions): Promise<QueryExecutionResponse>;
}
