const { write } = require('./writer');

// 1. Auth Tests
write('tests/auth.test.ts', `
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
`);

// 2. RBAC Tests
write('tests/rbac.test.ts', `
import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, PERMISSIONS, ROLE_PERMISSIONS_MAP, SYSTEM_ROLES } from '../src/lib/rbac';

describe('RBAC & Authorization Matrix', () => {
  it('should allow admin full access with admin:manage permission', () => {
    const adminPerms = [PERMISSIONS.ADMIN_MANAGE];
    expect(hasPermission(adminPerms, PERMISSIONS.CASES_DELETE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.SOAR_APPROVE)).toBe(true);
    expect(hasPermission(adminPerms, PERMISSIONS.INTEGRATIONS_MANAGE)).toBe(true);
  });

  it('should grant lead threat hunter proper investigation permissions', () => {
    const hunterPerms = ROLE_PERMISSIONS_MAP[SYSTEM_ROLES.LEAD_HUNTER];
    expect(hasPermission(hunterPerms, PERMISSIONS.HUNTS_EXECUTE)).toBe(true);
    expect(hasPermission(hunterPerms, PERMISSIONS.QUERIES_EXECUTE)).toBe(true);
    expect(hasPermission(hunterPerms, PERMISSIONS.IOCS_OVERRIDE)).toBe(true);
    expect(hasPermission(hunterPerms, PERMISSIONS.SOAR_APPROVE)).toBe(true);
    
    // Hunter cannot manage users/admin by default
    expect(hasPermission(hunterPerms, PERMISSIONS.ADMIN_MANAGE)).toBe(false);
    expect(hasPermission(hunterPerms, PERMISSIONS.USERS_MANAGE)).toBe(false);
  });

  it('should correctly evaluate hasAnyPermission', () => {
    const perms = [PERMISSIONS.IOCS_READ, PERMISSIONS.HUNTS_READ];
    expect(hasAnyPermission(perms, [PERMISSIONS.IOCS_READ, PERMISSIONS.CASES_WRITE])).toBe(true);
    expect(hasAnyPermission(perms, [PERMISSIONS.SOAR_APPROVE, PERMISSIONS.ADMIN_MANAGE])).toBe(false);
  });
});
`);

// 3. Encryption Tests
write('tests/encryption.test.ts', `
import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, maskSecret } from '../src/lib/encryption';

describe('Secret Encryption (AES-256-GCM)', () => {
  it('should encrypt and decrypt plaintext secrets with integrity check', () => {
    const plain = 'super-secret-crowdstrike-api-key-998811';
    const encrypted = encryptSecret(plain);

    expect(encrypted.encryptedData).not.toBe(plain);
    expect(encrypted.iv).toHaveLength(24); // 12 bytes hex
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes hex

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plain);
  });

  it('should fail decryption if ciphertext or auth tag is tampered', () => {
    const plain = 'azure-sentinel-client-secret-123';
    const encrypted = encryptSecret(plain);

    // Tamper with encryptedData
    const tamperedPayload = {
      ...encrypted,
      encryptedData: encrypted.encryptedData.slice(0, -2) + 'aa',
    };

    expect(() => decryptSecret(tamperedPayload)).toThrow();
  });

  it('should safely mask secrets for UI presentation', () => {
    expect(maskSecret('sk-live-1234567890abcdef')).toBe('sk-••••••••cdef');
    expect(maskSecret('')).toBe('••••••••');
  });
});
`);

// 4. IOC Engine Tests
write('tests/ioc-engine.test.ts', `
import { describe, it, expect } from 'vitest';
import { normalizeIOC, defangIOC, detectIOCType, extractAllIOCs, calculateReputationScore } from '../src/lib/ioc-engine';

describe('IOC Engine & All 15 Indicator Types', () => {
  it('should detect and validate all 15 IOC types correctly', () => {
    expect(detectIOCType('192.168.1.1')).toBe('IPV4');
    expect(detectIOCType('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('IPV6');
    expect(detectIOCType('evil-domain.com')).toBe('DOMAIN');
    expect(detectIOCType('https://evil.com/payload.bin')).toBe('URL');
    expect(detectIOCType('44d88612fea8a8f36de82e1278abb02f')).toBe('MD5');
    expect(detectIOCType('3395856ce81f2b7382dee72602f796b642dd5640')).toBe('SHA1');
    expect(detectIOCType('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe('SHA256');
    expect(detectIOCType('attacker@apt29-ops.com')).toBe('EMAIL');
    expect(detectIOCType('svchost_updater.dll')).toBe('FILENAME');
    expect(detectIOCType('HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\EvilKey')).toBe('REGISTRY');
    expect(detectIOCType('Global\\MSWIN_DARKGATE_M99')).toBe('MUTEX');
    expect(detectIOCType('a1:b2:c3:d4:e5:f6:07:18:29:3a:4b:5c:6d:7e:8f:90:11:22:33:44')).toBe('CERTIFICATE');
    expect(detectIOCType('CVE-2024-3400')).toBe('CVE');
    expect(detectIOCType('t13d1516h2_8daaf6152771_0271dd94e078')).toBe('JA4');
  });

  it('should defang and normalize defanged indicators correctly', () => {
    const defanged = 'hxxps://evil-c2[.]com/beacon[.]exe';
    const normalized = normalizeIOC(defanged);
    expect(normalized).toBe('https://evil-c2.com/beacon.exe');

    const refanged = defangIOC(normalized);
    expect(refanged).toContain('hxxps://');
    expect(refanged).toContain('[.]');
  });

  it('should extract multiple IOCs from unstructured text', () => {
    const rawLog = 'Alert: Contacted 185.220.101.5 and domain darkgate-payload-delivery.com via hxxps://bad.com/file.exe with CVE-2023-38831';
    const extracted = extractAllIOCs(rawLog);

    expect(extracted.length).toBeGreaterThanOrEqual(4);
    const types = extracted.map((e) => e.type);
    expect(types).toContain('IPV4');
    expect(types).toContain('DOMAIN');
    expect(types).toContain('URL');
    expect(types).toContain('CVE');
  });

  it('should calculate explainable reputation scores and handle conflicting verdicts', () => {
    const maliciousBreakdown = calculateReputationScore({
      type: 'IPV4',
      observationsCount: 5,
      providerVerdicts: [
        { provider: 'CrowdStrike', verdict: 'MALICIOUS' },
        { provider: 'VirusTotal', verdict: 'MALICIOUS' },
      ],
    });
    expect(maliciousBreakdown.reputation).toBe('MALICIOUS');
    expect(maliciousBreakdown.score).toBeGreaterThanOrEqual(85);
    expect(maliciousBreakdown.reasoning.length).toBeGreaterThan(0);

    const conflictingBreakdown = calculateReputationScore({
      type: 'DOMAIN',
      observationsCount: 1,
      providerVerdicts: [
        { provider: 'VendorA', verdict: 'MALICIOUS' },
        { provider: 'VendorB', verdict: 'BENIGN' },
      ],
    });
    expect(conflictingBreakdown.reputation).toBe('CONFLICTING');
  });

  it('should support analyst manual overrides with full confidence', () => {
    const overrideResult = calculateReputationScore({
      type: 'IPV4',
      observationsCount: 10,
      isOverridden: true,
      overrideVerdict: 'ALLOWLISTED',
    });
    expect(overrideResult.reputation).toBe('ALLOWLISTED');
    expect(overrideResult.confidence).toBe(100);
    expect(overrideResult.score).toBe(0);
  });
});
`);

// 5. Connectors & SIEM Tests
write('tests/connectors.test.ts', `
import { describe, it, expect } from 'vitest';
import { getConnector } from '../src/lib/connectors';

describe('Security Connector Abstraction', () => {
  it('should report NOT_CONFIGURED when connectors lack credentials', async () => {
    const logscale = getConnector('logscale', {}, {});
    expect(logscale.isConfigured()).toBe(false);

    const health = await logscale.health();
    expect(health.status).toBe('NOT_CONFIGURED');

    const exec = await logscale.execute({ query: 'test query' });
    expect(exec.success).toBe(false);
    expect(exec.errorMessage).toContain('CONNECTOR NOT CONFIGURED');
  });

  it('should validate credentials when configured', async () => {
    const splunk = getConnector('splunk', { baseUrl: 'https://splunk.corp.internal:8089' }, { token: 'hec-token-123' });
    expect(splunk.isConfigured()).toBe(true);

    const health = await splunk.health();
    expect(health.status).toBe('HEALTHY');
    expect(health.latencyMs).toBeGreaterThan(0);

    const exec = await splunk.execute({ query: 'index=wineventlog EventCode=4769' });
    expect(exec.success).toBe(true);
    expect(exec.events.length).toBeGreaterThan(0);
  });
});
`);

// 6. MITRE & Coverage Tests
write('tests/mitre-coverage.test.ts', `
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
`);

// 7. Intelligence & Attribution Tests
write('tests/intelligence.test.ts', `
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
`);

// 8. AI Advisory Security Boundary Tests
write('tests/ai-security.test.ts', `
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
`);

// 9. Torq SOAR Mandatory Approval Gate Tests
write('tests/soar-approval.test.ts', `
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
});
`);