import { IAIProvider, AIAnalysisRequest, AIAnalysisResponse } from "./types";

export class MockSecurityAIProvider implements IAIProvider {
  name = "SUMI-TAH Advisory Security Intelligence (Offline Model)";

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    switch (request.capability) {
      case "HYPOTHESIS_GEN":
        return {
          capability: request.capability,
          summary: "Identified high-probability adversary persistence mechanism targeting Active Directory environment.",
          recommendations: [
            "Hunt for abnormal Kerberos TGS ticket requests with RC4 encryption (T1558.003 - Kerberoasting)",
            "Analyze ServicePrincipalNames (SPN) associated with high-privilege service accounts",
            "Correlate Windows Event ID 4769 (A Kerberos ticket was requested) against known privileged account baselines",
          ],
          advisoryDisclaimer: "ADVISORY ONLY: Analyst review required prior to initiating active hunting or SIEM query deployment.",
          isAdvisory: true,
          confidenceScore: 88,
        };

      case "HUNT_SUMMARY":
        return {
          capability: request.capability,
          summary: "Hunt analysis uncovered 3 suspicious LSASS process access attempts originating from non-standard backup service accounts.",
          recommendations: [
            "Escalate Finding #F-102 to Incident Case for active containment evaluation",
            "Cross-reference source IP 10.0.4.15 against recent credential access telemetry",
            "Request memory capture evidence for host DC01.corp.internal",
          ],
          advisoryDisclaimer: "ADVISORY ONLY: AI cannot autonomously escalate cases or declare true positive incidents.",
          isAdvisory: true,
          confidenceScore: 92,
        };

      case "IOC_EXPLAIN":
        return {
          capability: request.capability,
          summary: "Indicator exhibits high-confidence characteristics of Cobalt Strike malleable C2 beacon infrastructure.",
          recommendations: [
            "Verify whether network perimeter firewall has active egress blocks for the target destination",
            "Query DNS telemetry for abnormal subdomains or high entropy host queries",
            "Inspect process telemetry on originating host for injected DLL or unbacked memory regions",
          ],
          advisoryDisclaimer: "ADVISORY ONLY: Reputation verdicts and containment actions require human authorization.",
          isAdvisory: true,
          confidenceScore: 85,
        };

      case "COVERAGE_GAP":
        return {
          capability: request.capability,
          summary: "Critical visibility deficit detected across MITRE ATT&CK Execution and Defense Evasion tactics.",
          recommendations: [
            "Implement Sysmon Event ID 1 (Process Create) with Command-Line argument logging",
            "Deploy Hunt Package for LOLBAS utility execution (Certutil, Mshta, Rundll32)",
            "Enable PowerShell Script Block Logging (Event ID 4104)",
          ],
          advisoryDisclaimer: "ADVISORY ONLY: Guidance intended to assist detection engineering roadmaps.",
          isAdvisory: true,
          confidenceScore: 90,
        };

      case "CASE_ASSIST":
      default:
        return {
          capability: request.capability,
          summary: "Investigation timeline indicates coordinated adversary activity spanning Initial Access to Credential Dumping.",
          recommendations: [
            "Preserve triage triage packages and authentication logs before remediation",
            "Request approval for host isolation on compromised endpoints",
            "Initiate domain-wide password reset for affected service accounts",
          ],
          advisoryDisclaimer: "ADVISORY ONLY: Response actions must be authorized by Lead Threat Hunter or Security Administrator.",
          isAdvisory: true,
          confidenceScore: 89,
        };
    }
  }
}