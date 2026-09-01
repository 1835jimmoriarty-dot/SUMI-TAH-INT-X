import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/auth';

describe('Auth & Session Security', () => {
  it('should hash and verify passwords correctly with bcrypt', async () => {
    const rawPass = 'SuperSecurePassword2026!';
    const hash = await hashPassword(rawPass);

    expect(hash).not.toBe(rawPass);
    expect(hash.startsWith('$2')).toBe(true);

    const isValid = await verifyPassword(rawPass, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongPassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('should generate and verify signed JWT session tokens', async () => {
    const payload = {
      userId: 'user-123',
      email: 'analyst@sumitah.local',
      name: 'Alex Vance',
      orgId: 'org-456',
      roles: ['LEAD_HUNTER'],
      permissions: ['hunts:read', 'hunts:write', 'queries:execute'],
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.roles).toContain('LEAD_HUNTER');
    expect(verified?.permissions).toContain('queries:execute');
  });

  it('should reject invalid or tampered session tokens', async () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.token';
    const verified = await verifySessionToken(invalidToken);
    expect(verified).toBeNull();
  });
});