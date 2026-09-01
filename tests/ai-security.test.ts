import { describe, it, expect } from 'vitest';
import { getAIProvider } from '../src/lib/ai';

describe('AI Advisory Security Boundary', () => {
  it('should ensure AI output is strictly advisory and non-destructive', async () => {
    const provider = getAIProvider();
    const result = await provider.analyze({
      capability: 'HUNT_SUMMARY',
      prompt: 'Summarize LSASS memory access hunt findings',
    });

    expect(result.isAdvisory).toBe(true);
    expect(result.advisoryDisclaimer).toContain('ADVISORY ONLY');
    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });
});