export type IOCType =
  | "IPV4"
  | "IPV6"
  | "DOMAIN"
  | "URL"
  | "MD5"
  | "SHA1"
  | "SHA256"
  | "EMAIL"
  | "FILENAME"
  | "REGISTRY"
  | "MUTEX"
  | "CERTIFICATE"
  | "CVE"
  | "JA3"
  | "JA4";

export type ReputationVerdict =
  | "MALICIOUS"
  | "HIGH_RISK"
  | "SUSPICIOUS"
  | "UNKNOWN"
  | "BENIGN"
  | "ALLOWLISTED"
  | "CONFLICTING";

export interface ExtractedIOC {
  type: IOCType;
  rawValue: string;
  normalizedValue: string;
  defangedValue: string;
}

export interface ReputationBreakdown {
  reputation: ReputationVerdict;
  score: number;
  confidence: number;
  reasoning: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

export function normalizeIOC(value: string): string {
  if (!value) return "";
  let v = value.trim();

  v = v.replace(/hxxps?:\/\//gi, (m) => (m.toLowerCase().startsWith("hxxps") ? "https://" : "http://"));
  v = v.replace(/fxp:\/\//gi, "ftp://");
  v = v.replace(/\[\.\]/g, ".");
  v = v.replace(/\(\.\)/g, ".");
  v = v.replace(/\[dot\]/gi, ".");
  v = v.replace(/\(dot\)/gi, ".");
  v = v.replace(/\[@\]/g, "@");
  v = v.replace(/\(@\)/g, "@");
  v = v.replace(/\[at\]/gi, "@");
  v = v.replace(/\(at\)/gi, "@");
  v = v.replace(/\[:\]/g, ":");

  return v;
}

export function defangIOC(value: string): string {
  if (!value) return "";
  let v = value.trim();

  v = v.replace(/https:\/\//gi, "hxxps://");
  v = v.replace(/http:\/\//gi, "hxxp://");
  v = v.replace(/ftp:\/\//gi, "fxp://");
  v = v.replace(/@/g, "[@]");
  v = v.replace(/\./g, "[.]");

  return v;
}

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;
const MD5_REGEX = /^[a-fA-F0-9]{32}$/;
const SHA1_REGEX = /^[a-fA-F0-9]{40}$/;
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;
const CVE_REGEX = /^CVE-\d{4}-\d{4,7}$/i;
const JA3_REGEX = /^[a-fA-F0-9]{32}$/;
const JA4_REGEX = /^t[0-9a-z]{8,14}_[a-f0-9]{12}_[a-f0-9]{12}$/i;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_REGEX = /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/i;
const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;
const REGISTRY_REGEX = /^(?:HKLM|HKCU|HKCR|HKU|HKCC|HKEY_LOCAL_MACHINE|HKEY_CURRENT_USER|HKEY_CLASSES_ROOT|HKEY_USERS|HKEY_CURRENT_CONFIG)[\\][\w\s\\-_]+$/i;
const FILENAME_REGEX = /^[\w\s\-_.()]+\.(?:exe|dll|sys|ps1|bat|vbs|sh|elf|bin|scr|tmp|zip|tar|gz|7z|rar|pdf|docx|xlsx|js|py|hta|vbe|jar|iso)$/i;
const MUTEX_REGEX = /^(?:Global\\|Local\\|BaseNamedObjects\\)?[\w\s\-_.@$#]{3,80}$/i;
const CERT_REGEX = /^(?:[a-fA-F0-9]{2}:){19,31}[a-fA-F0-9]{2}$/i;

export function detectIOCType(input: string): IOCType | null {
  const norm = normalizeIOC(input);

  if (CVE_REGEX.test(norm)) return "CVE";
  if (JA4_REGEX.test(norm)) return "JA4";
  if (CERT_REGEX.test(norm)) return "CERTIFICATE";
  if (URL_REGEX.test(norm)) return "URL";
  if (EMAIL_REGEX.test(norm)) return "EMAIL";
  if (REGISTRY_REGEX.test(norm) || (norm.startsWith("HKLM\\") || norm.startsWith("HKCU\\") || norm.startsWith("HKEY_"))) return "REGISTRY";
  if (IPV4_REGEX.test(norm)) return "IPV4";
  if (IPV6_REGEX.test(norm)) return "IPV6";
  if (SHA256_REGEX.test(norm)) return "SHA256";
  if (SHA1_REGEX.test(norm)) return "SHA1";
  if (FILENAME_REGEX.test(norm)) return "FILENAME";
  if (DOMAIN_REGEX.test(norm)) return "DOMAIN";
  if (MD5_REGEX.test(norm)) return "MD5";
  if (MUTEX_REGEX.test(norm) && (norm.startsWith("Global\\") || norm.startsWith("Local\\") || norm.includes("MUTEX") || norm.includes("Mutex"))) {
    return "MUTEX";
  }

  return null;
}

export function extractAllIOCs(rawText: string): ExtractedIOC[] {
  if (!rawText) return [];

  const results: ExtractedIOC[] = [];
  const seen = new Set<string>();
  const tokens = rawText.split(/[\s,;"'<>]+/).filter(Boolean);

  for (const token of tokens) {
    const norm = normalizeIOC(token);
    const type = detectIOCType(norm);

    if (type && !seen.has(norm.toLowerCase())) {
      seen.add(norm.toLowerCase());
      results.push({
        type,
        rawValue: token,
        normalizedValue: norm,
        defangedValue: defangIOC(norm),
      });
    }
  }

  return results;
}

export function calculateReputationScore(params: {
  type: IOCType;
  observationsCount: number;
  providerVerdicts?: Array<{ provider: string; verdict: string; score?: number }>;
  isOverridden?: boolean;
  overrideVerdict?: ReputationVerdict;
}): ReputationBreakdown {
  if (params.isOverridden && params.overrideVerdict) {
    const overrideScoreMap: Record<ReputationVerdict, number> = {
      MALICIOUS: 95,
      HIGH_RISK: 80,
      SUSPICIOUS: 60,
      UNKNOWN: 30,
      BENIGN: 10,
      ALLOWLISTED: 0,
      CONFLICTING: 50,
    };
    return {
      reputation: params.overrideVerdict,
      score: overrideScoreMap[params.overrideVerdict],
      confidence: 100,
      reasoning: [
        {
          factor: "Analyst Override",
          impact: overrideScoreMap[params.overrideVerdict],
          description: "Authoritative manual verdict override applied by verified security analyst with audit trail.",
        },
      ],
    };
  }

  const reasoning: Array<{ factor: string; impact: number; description: string }> = [];
  let baseScore = 0;
  let confidence = 50;

  const verdicts = params.providerVerdicts || [];
  const maliciousCount = verdicts.filter((v) => v.verdict.toUpperCase() === "MALICIOUS").length;
  const suspiciousCount = verdicts.filter((v) => v.verdict.toUpperCase() === "SUSPICIOUS").length;
  const cleanCount = verdicts.filter((v) => ["BENIGN", "CLEAN"].includes(v.verdict.toUpperCase())).length;

  if (verdicts.length > 0) {
    if (maliciousCount > 0 && cleanCount > 0 && maliciousCount === cleanCount) {
      reasoning.push({
        factor: "Threat Intel Discrepancy",
        impact: 50,
        description: `Conflicting verdicts across intelligence providers: ${maliciousCount} malicious vs ${cleanCount} clean.`,
      });
      return {
        reputation: "CONFLICTING",
        score: 50,
        confidence: 65,
        reasoning,
      };
    }

    if (maliciousCount > 0) {
      const added = Math.min(85, maliciousCount * 45);
      baseScore += added;
      reasoning.push({
        factor: "Adversary Intelligence Detections",
        impact: added,
        description: `${maliciousCount} threat intelligence source(s) flagged this indicator as confirmed malicious.`,
      });
    }

    if (suspiciousCount > 0) {
      const added = Math.min(45, suspiciousCount * 25);
      baseScore += added;
      reasoning.push({
        factor: "Suspicious Heuristics",
        impact: added,
        description: `${suspiciousCount} source(s) detected suspicious or anomalous patterns.`,
      });
    }

    if (cleanCount > 0 && maliciousCount === 0 && suspiciousCount === 0) {
      baseScore = 5;
      reasoning.push({
        factor: "Clean Provider Reports",
        impact: -20,
        description: `${cleanCount} threat intelligence sources verified this indicator as benign/clean.`,
      });
    }

    confidence = Math.min(95, 50 + verdicts.length * 15);
  } else {
    reasoning.push({
      factor: "No External Intel Feed",
      impact: 0,
      description: "Indicator has not yet been correlated against external commercial feeds.",
    });
  }

  if (params.observationsCount > 0) {
    const obsImpact = Math.min(20, params.observationsCount * 2);
    baseScore = Math.min(100, baseScore + (maliciousCount > 0 ? obsImpact : 0));
    reasoning.push({
      factor: "Internal Telemetry Observations",
      impact: obsImpact,
      description: `Observed ${params.observationsCount} times across enterprise endpoint & SIEM telemetry.`,
    });
    confidence = Math.min(100, confidence + 10);
  }

  const finalScore = Math.max(0, Math.min(100, baseScore));

  let reputation: ReputationVerdict = "UNKNOWN";
  if (finalScore >= 80) reputation = "MALICIOUS";
  else if (finalScore >= 60) reputation = "HIGH_RISK";
  else if (finalScore >= 40) reputation = "SUSPICIOUS";
  else if (finalScore > 10) reputation = "UNKNOWN";
  else reputation = "BENIGN";

  return {
    reputation,
    score: finalScore,
    confidence,
    reasoning,
  };
}