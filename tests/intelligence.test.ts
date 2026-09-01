import { describe, it, expect } from 'vitest';
import { calculateAttribution } from '../src/lib/attribution-engine';

describe('Adversary Intelligence & Attribution Engine', () => {
  it('should calculate evidence-weighted attribution scores', () => {
    const actor = {
      id: 'actor-apt29',
      name: 'APT29 (Cozy Bear)',
      targetSectors: ['Government', 'Defense', 'Technology'],
      techniques: ['T1059.001', 'T1003.001', 'T1558.003', 'T1071.001'],
      malwareNames: ['Cobalt Strike Beacon', 'Mimikatz'],
    };

    const investigation = {
      observedTechniques: ['T1059.001', 'T1003.001'],
      observedMalware: ['Cobalt Strike Beacon'],
      observedIOCs: ['185.220.101.5', 'darkgate-payload-delivery.com'],
      victimSector: 'Defense',
    };

    const result = calculateAttribution({ actor, investigation });

    expect(result.actorName).toBe('APT29 (Cozy Bear)');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(45);
    expect(result.factors.length).toBeGreaterThanOrEqual(3);
    expect(['HIGH', 'MEDIUM']).toContain(result.confidenceRating);
  });
});