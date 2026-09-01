import { describe, it, expect } from 'vitest';
import { calculateDetectionCoverage, MITRE_TACTICS } from '../src/lib/coverage-engine';

describe('MITRE ATT&CK & Detection Coverage Engine', () => {
  it('should deterministically calculate overall and tactic coverage', () => {
    const allTechniques = [
      { techniqueId: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
      { techniqueId: 'T1059.003', name: 'Windows Command Shell', tactic: 'Execution' },
      { techniqueId: 'T1003.001', name: 'LSASS Memory', tactic: 'Credential Access' },
      { techniqueId: 'T1558.003', name: 'Kerberoasting', tactic: 'Credential Access' },
      { techniqueId: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' },
    ];

    const activeAttackTags = ['T1059.001', 'T1003.001'];

    const report = calculateDetectionCoverage({ allTechniques, activeAttackTags });

    expect(report.totalTechniques).toBe(5);
    expect(report.totalCovered).toBe(2);
    expect(report.coveragePercentage).toBe(40);
    expect(report.tacticBreakdown.length).toBe(14); // All 14 tactics

    const execTactic = report.tacticBreakdown.find((t) => t.tactic === 'Execution');
    expect(execTactic?.coveredTechniques).toBe(1);
    expect(execTactic?.totalTechniques).toBe(2);
    expect(execTactic?.coveragePercentage).toBe(50);

    expect(report.gaps.length).toBe(3);
    expect(report.gaps[0].techniqueId).toBeDefined();
  });
});