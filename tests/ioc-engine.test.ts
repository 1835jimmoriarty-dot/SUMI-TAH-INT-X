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
    expect(maliciousBreakdown.score).toBeGreaterThanOrEqual(80);
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