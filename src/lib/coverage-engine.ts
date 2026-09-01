export const MITRE_TACTICS = [
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
] as const;

export type MitreTacticName = (typeof MITRE_TACTICS)[number];

export interface TacticCoverage {
  tactic: string;
  totalTechniques: number;
  coveredTechniques: number;
  coveragePercentage: number;
  activeHuntCount: number;
  queryCount: number;
}

export interface DetectionGap {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  recommendation: string;
}

export interface OverallCoverageReport {
  totalTechniques: number;
  totalCovered: number;
  coveragePercentage: number;
  tacticBreakdown: TacticCoverage[];
  gaps: DetectionGap[];
}

export function calculateDetectionCoverage(params: {
  allTechniques: Array<{ techniqueId: string; name: string; tactic: string }>;
  activeAttackTags: string[]; // List of technique IDs with active hunts or queries
}): OverallCoverageReport {
  const coveredSet = new Set(params.activeAttackTags);
  const tacticMap: Record<string, { total: number; covered: number }> = {};

  MITRE_TACTICS.forEach((t) => {
    tacticMap[t] = { total: 0, covered: 0 };
  });

  const gaps: DetectionGap[] = [];

  params.allTechniques.forEach((tech) => {
    if (!tacticMap[tech.tactic]) {
      tacticMap[tech.tactic] = { total: 0, covered: 0 };
    }
    tacticMap[tech.tactic].total += 1;

    if (coveredSet.has(tech.techniqueId)) {
      tacticMap[tech.tactic].covered += 1;
    } else {
      let priority: DetectionGap["priority"] = "MEDIUM";
      if (["Execution", "Persistence", "Privilege Escalation", "Credential Access"].includes(tech.tactic)) {
        priority = "CRITICAL";
      } else if (["Lateral Movement", "Defense Evasion", "Command and Control"].includes(tech.tactic)) {
        priority = "HIGH";
      }

      gaps.push({
        techniqueId: tech.techniqueId,
        techniqueName: tech.name,
        tactic: tech.tactic,
        priority,
        recommendation: `Deploy SIEM queries or hunt package for ${tech.techniqueId} (${tech.name}) to remediate ${tech.tactic} visibility gap.`,
      });
    }
  });

  const tacticBreakdown: TacticCoverage[] = MITRE_TACTICS.map((tactic) => {
    const data = tacticMap[tactic] || { total: 0, covered: 0 };
    const pct = data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0;
    return {
      tactic,
      totalTechniques: data.total,
      coveredTechniques: data.covered,
      coveragePercentage: pct,
      activeHuntCount: Math.round(data.covered * 0.7),
      queryCount: data.covered,
    };
  });

  const totalTechs = params.allTechniques.length;
  const totalCovered = params.allTechniques.filter((t) => coveredSet.has(t.techniqueId)).length;
  const coveragePercentage = totalTechs > 0 ? Math.round((totalCovered / totalTechs) * 100) : 0;

  // Sort gaps by priority: CRITICAL -> HIGH -> MEDIUM
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    totalTechniques: totalTechs,
    totalCovered,
    coveragePercentage,
    tacticBreakdown,
    gaps,
  };
}
