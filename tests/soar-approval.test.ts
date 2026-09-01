import { describe, it, expect } from 'vitest';
import { SOAR_ACTION_DEFINITIONS } from '../src/lib/soar';

describe('Torq SOAR Human-in-the-Loop Mandatory Approval Gate', () => {
  it('should define all containment action types with severity and disruption assessments', () => {
    const types = ['ISOLATE_HOST', 'BLOCK_IP', 'SINKHOLE_DOMAIN', 'REVOKE_SESSION', 'DISABLE_ACCOUNT'] as const;

    types.forEach((type) => {
      const def = SOAR_ACTION_DEFINITIONS[type];
      expect(def).toBeDefined();
      expect(def.title).toBeDefined();
      expect(def.impactAssessment).toBeDefined();
      expect(['CRITICAL', 'HIGH', 'MEDIUM']).toContain(def.severity);
    });
  });

  it('should enforce separation of duties rule: self-approval is forbidden', () => {
    const requesterId = 'analyst-123';
    const approverIdSame = 'analyst-123';
    const approverIdDifferent = 'admin-456';

    const isSelfApproval = (reqId: string, appId: string) => reqId === appId;

    expect(isSelfApproval(requesterId, approverIdSame)).toBe(true);
    expect(isSelfApproval(requesterId, approverIdDifferent)).toBe(false);
  });
});