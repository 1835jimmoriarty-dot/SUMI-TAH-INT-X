import { SOARActionType } from "./types";

export interface ActionDefinition {
  type: SOARActionType;
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  impactAssessment: string;
  targetPlaceholder: string;
}

export const SOAR_ACTION_DEFINITIONS: Record<SOARActionType, ActionDefinition> = {
  ISOLATE_HOST: {
    type: "ISOLATE_HOST",
    title: "Network Host Isolation",
    description: "Sever all network interfaces on endpoint except management telemetry to halt lateral movement.",
    severity: "CRITICAL",
    impactAssessment: "High disruption: User cannot access network or cloud resources from this host.",
    targetPlaceholder: "e.g. DC01.corp.internal or 10.0.4.15",
  },
  BLOCK_IP: {
    type: "BLOCK_IP",
    title: "Edge Firewall IP Null-Route",
    description: "Deploy firewall block rule across perimeter edge devices and Palo Alto / Fortinet firewalls.",
    severity: "HIGH",
    impactAssessment: "Moderate disruption: Blocks all inbound and outbound traffic to target IP.",
    targetPlaceholder: "e.g. 185.220.101.5",
  },
  SINKHOLE_DOMAIN: {
    type: "SINKHOLE_DOMAIN",
    title: "DNS Sinkhole Redirection",
    description: "Route malicious domain DNS queries to internal honeypot / sinkhole listener.",
    severity: "HIGH",
    impactAssessment: "Low user disruption: Prevents adversary C2 beacon resolution across the fleet.",
    targetPlaceholder: "e.g. evil-c2-beacon.net",
  },
  REVOKE_SESSION: {
    type: "REVOKE_SESSION",
    title: "Revoke Active Cloud / IAM Sessions",
    description: "Invalidate refresh tokens, Azure AD / Okta sessions, and terminate active OAuth grants.",
    severity: "MEDIUM",
    impactAssessment: "User must re-authenticate with multi-factor verification.",
    targetPlaceholder: "e.g. admin.backup@corp.internal",
  },
  DISABLE_ACCOUNT: {
    type: "DISABLE_ACCOUNT",
    title: "Disable Active Directory / IdP Account",
    description: "Immediately set account status to disabled in Active Directory and IdP directory.",
    severity: "CRITICAL",
    impactAssessment: "User cannot authenticate to any enterprise service.",
    targetPlaceholder: "e.g. jdoe@corp.internal",
  },
};