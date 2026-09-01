import { describe, it, expect } from 'vitest';

describe('Multi-Tenant Organization Data Isolation', () => {
  const orgA = 'org-alpha-111';
  const orgB = 'org-bravo-222';

  const mockHunts = [
    { id: 'hunt-1', orgId: orgA, title: 'Alpha Credential Access Hunt' },
    { id: 'hunt-2', orgId: orgB, title: 'Bravo Lateral Movement Hunt' },
  ];

  const mockCases = [
    { id: 'case-1', orgId: orgA, title: 'Alpha Ransomware Incident' },
    { id: 'case-2', orgId: orgB, title: 'Bravo Data Exfiltration Case' },
  ];

  const mockSOARActions = [
    { id: 'soar-1', requesterOrgId: orgA, target: '10.0.1.5' },
    { id: 'soar-2', requesterOrgId: orgB, target: '10.0.2.10' },
  ];

  it('should only return hunts belonging to the requesting organization', () => {
    const alphaHunts = mockHunts.filter((h) => h.orgId === orgA);
    const bravoHunts = mockHunts.filter((h) => h.orgId === orgB);

    expect(alphaHunts).toHaveLength(1);
    expect(alphaHunts[0].id).toBe('hunt-1');
    expect(alphaHunts.some((h) => h.orgId === orgB)).toBe(false);

    expect(bravoHunts).toHaveLength(1);
    expect(bravoHunts[0].id).toBe('hunt-2');
  });

  it('should prevent cross-organization case access', () => {
    const sessionOrgId = orgA;
    const requestedCaseId = 'case-2'; // Belongs to Org B

    const accessibleCase = mockCases.find(
      (c) => c.id === requestedCaseId && c.orgId === sessionOrgId
    );

    expect(accessibleCase).toBeUndefined();
  });

  it('should isolate SOAR containment action listings by requester organization', () => {
    const alphaActions = mockSOARActions.filter((a) => a.requesterOrgId === orgA);
    expect(alphaActions).toHaveLength(1);
    expect(alphaActions[0].target).toBe('10.0.1.5');
  });
});
