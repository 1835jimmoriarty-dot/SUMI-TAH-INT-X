import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const DEFAULT_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function getSecretKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, "hex");
  }
  return crypto.createHash("sha256").update(envKey).digest();
}

export interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(plainText: string): EncryptedPayload {
  if (!plainText) {
    throw new Error("Cannot encrypt empty data");
  }

  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  if (!payload.encryptedData || !payload.iv || !payload.authTag) {
    throw new Error("Incomplete encrypted payload provided");
  }

  const key = getSecretKey();
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(payload.encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function maskSecret(secret: string): string {
  if (!secret) return "••••••••";
  if (secret.length <= 6) return "••••••••";
  const start = secret.slice(0, 3);
  const end = secret.slice(-4);
  return `${start}••••••••${end}`;
}