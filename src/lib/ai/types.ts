export interface AIAnalysisRequest {
  capability: "HYPOTHESIS_GEN" | "HUNT_SUMMARY" | "IOC_EXPLAIN" | "COVERAGE_GAP" | "CASE_ASSIST";
  prompt: string;
  contextData?: Record<string, unknown>;
}

export interface AIAnalysisResponse {
  capability: string;
  summary: string;
  recommendations: string[];
  advisoryDisclaimer: string;
  isAdvisory: true; // Strictly advisory guarantee
  confidenceScore: number;
}

export interface IAIProvider {
  name: string;
  analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
}