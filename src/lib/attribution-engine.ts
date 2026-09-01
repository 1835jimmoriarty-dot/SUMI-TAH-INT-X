export interface AttributionFactor {
  category: "TTP_OVERLAP" | "MALWARE_SIGNATURE" | "INFRASTRUCTURE_IOC" | "TARGETING_ALIGNMENT";
  description: string;
  weight: number;
  matchedItems: string[];
}

export interface AttributionResult {
  actorId: string;
  actorName: string;
  confidenceScore: number; // 0 to 100
  confidenceRating: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
  factors: AttributionFactor[];
  summary: string;
}

export function calculateAttribution(params: {
  actor: {
    id: string;
    name: string;
    targetSectors?: string[];
    techniques?: string[];
    malwareNames?: string[];
  };
  investigation: {
    observedTechniques: string[];
    observedMalware: string[];
    observedIOCs: string[];
    victimSector?: string;
  };
}): AttributionResult {
  const factors: AttributionFactor[] = [];
  let totalScore = 0;

  // 1. TTP Overlap (Max 40 points)
  const actorTechs = new Set(params.actor.techniques || []);
  const matchedTechs = params.investigation.observedTechniques.filter((t) => actorTechs.has(t));
  if (matchedTechs.length > 0) {
    const score = Math.min(40, matchedTechs.length * 10);
    totalScore += score;
    factors.push({
      category: "TTP_OVERLAP",
      description: `Observed ${matchedTechs.length} overlapping MITRE ATT&CK techniques associated with ${params.actor.name}.`,
      weight: score,
      matchedItems: matchedTechs,
    });
  }

  // 2. Malware Signature Overlap (Max 35 points)
  const actorMalware = new Set((params.actor.malwareNames || []).map((m) => m.toLowerCase()));
  const matchedMalware = params.investigation.observedMalware.filter((m) =>
    actorMalware.has(m.toLowerCase())
  );
  if (matchedMalware.length > 0) {
    const score = Math.min(35, matchedMalware.length * 20);
    totalScore += score;
    factors.push({
      category: "MALWARE_SIGNATURE",
      description: `Identified payload(s) explicitly utilized in known ${params.actor.name} operations.`,
      weight: score,
      matchedItems: matchedMalware,
    });
  }

  // 3. Targeting Alignment (Max 15 points)
  if (
    params.investigation.victimSector &&
    params.actor.targetSectors?.map((s) => s.toLowerCase()).includes(params.investigation.victimSector.toLowerCase())
  ) {
    totalScore += 15;
    factors.push({
      category: "TARGETING_ALIGNMENT",
      description: `Victim industry sector (${params.investigation.victimSector}) matches historical adversary objective profile.`,
      weight: 15,
      matchedItems: [params.investigation.victimSector],
    });
  }

  // 4. Infrastructure & Artifacts (Max 10 points)
  if (params.investigation.observedIOCs.length > 0) {
    const iocScore = Math.min(10, params.investigation.observedIOCs.length * 2);
    totalScore += iocScore;
    factors.push({
      category: "INFRASTRUCTURE_IOC",
      description: `Correlated ${params.investigation.observedIOCs.length} infrastructure indicators.`,
      weight: iocScore,
      matchedItems: params.investigation.observedIOCs.slice(0, 5),
    });
  }

  const confidenceScore = Math.min(100, Math.max(0, totalScore));
  let confidenceRating: AttributionResult["confidenceRating"] = "INSUFFICIENT_DATA";
  if (confidenceScore >= 75) confidenceRating = "HIGH";
  else if (confidenceScore >= 45) confidenceRating = "MEDIUM";
  else if (confidenceScore > 15) confidenceRating = "LOW";

  return {
    actorId: params.actor.id,
    actorName: params.actor.name,
    confidenceScore,
    confidenceRating,
    factors,
    summary: `Attribution confidence for ${params.actor.name} is assessed at ${confidenceScore}% (${confidenceRating}) based on ${factors.length} verifiable evidence dimensions.`,
  };
}
