import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "sumitah_session";
const DEFAULT_DEV_SECRET = "sumitah-jwt-secret-key-change-in-production-2026";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;

// Warn clearly if running with default secret
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_SECRET)
) {
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    console.warn(
      "[SECURITY WARNING] Running with default JWT secret in production mode. Set JWT_SECRET in environment variables."
    );
  }
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  roles: string[];
  permissions: string[];
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(
  payload: Omit<SessionPayload, "exp">
): Promise<string> {
  const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS || "24", 10);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiryHours}h`)
    .sign(secretKey);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(
  req: Request
): Promise<SessionPayload | null> {
  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const verified = await verifySessionToken(token);
    if (verified) return verified;
  }

  // 2. Check HttpOnly cookie
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k, v.join("=")];
      })
    );
    const sessionToken = cookies[AUTH_COOKIE_NAME];
    if (sessionToken) {
      return verifySessionToken(sessionToken);
    }
  }

  return null;
}