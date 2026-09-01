import { IAIProvider, AIAnalysisRequest, AIAnalysisResponse } from "./types";
import { MockSecurityAIProvider } from "./mock";

export class OpenAISecurityProvider implements IAIProvider {
  name = "OpenAI GPT-4 Security Advisory Model";
  private apiKey: string | undefined;
  private model: string;
  private fallback: MockSecurityAIProvider;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || "gpt-4o";
    this.fallback = new MockSecurityAIProvider();
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.apiKey) {
      // Graceful fallback to offline model if key is not configured
      return this.fallback.analyze(request);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: "You are an expert Threat Hunting and SOC Advisory AI. Provide strictly advisory security recommendations. Never assume authority to execute destructive actions or modify security state.",
            },
            {
              role: "user",
              content: `Capability: ${request.capability}\nPrompt: ${request.prompt}\nContext: ${JSON.stringify(request.contextData || {})}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        return this.fallback.analyze(request);
      }

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0]?.message?.content || "{}");

      return {
        capability: request.capability,
        summary: parsed.summary || "Advisory intelligence analysis generated.",
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        advisoryDisclaimer: "ADVISORY ONLY: Analyst review required prior to executing any action.",
        isAdvisory: true,
        confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 85,
      };
    } catch {
      return this.fallback.analyze(request);
    }
  }
}