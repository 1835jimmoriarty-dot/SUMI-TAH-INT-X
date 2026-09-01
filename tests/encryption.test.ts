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