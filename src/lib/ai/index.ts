import { IAIProvider } from "./types";
import { MockSecurityAIProvider } from "./mock";
import { OpenAISecurityProvider } from "./openai";

export function getAIProvider(): IAIProvider {
  const provider = process.env.AI_PROVIDER || "mock";
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAISecurityProvider();
  }
  return new MockSecurityAIProvider();
}

export * from "./types";
export * from "./mock";
export * from "./openai";