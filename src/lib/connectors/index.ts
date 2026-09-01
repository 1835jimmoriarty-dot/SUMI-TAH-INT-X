import { IConnector, ConnectorProvider } from "./types";
import { LogScaleConnector } from "./logscale";
import { SentinelConnector } from "./sentinel";
import { SplunkConnector } from "./splunk";
import { FalconConnector } from "./falcon";

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
    default:
      throw new Error(`Unsupported connector provider: ${provider}`);
  }
}

export * from "./types";
export * from "./base";
export * from "./logscale";
export * from "./sentinel";
export * from "./splunk";
export * from "./falcon";
