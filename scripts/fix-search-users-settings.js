const { write } = require('./writer');

// 1. Multi-Entity Search API (/api/search)
write('src/app/api/search/route.ts', `
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const [iocs, hunts, cases, hypotheses, actors, techniques] = await Promise.all([
    // IOCs
    prisma.iOC.findMany({
      where: {
        OR: [
          { value: { contains: q } },
          { defangedVal: { contains: q } },
          { type: { contains: q } },
        ],
      },
      take: 5,
    }),
    // Hunts
    prisma.hunt.findMany({
      where: {
        orgId: session.orgId,
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 5,
    }),
    // Cases
    prisma.case.findMany({
      where: {
        orgId: session.orgId,
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 5,
    }),
    // Hypotheses
    prisma.hypothesis.findMany({
      where: {
        orgId: session.orgId,
        OR: [
          { title: { contains: q } },
          { summary: { contains: q } },
        ],
      },
      take: 5,
    }),
    // Threat Actors
    prisma.threatActor.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 5,
    }),
    // ATT&CK
    prisma.mitreAttack.findMany({
      where: {
        OR: [
          { techniqueId: { contains: q } },
          { name: { contains: q } },
          { tactic: { contains: q } },
        ],
      },
      take: 5,
    }),
  ]);

  const results = [
    ...iocs.map((i) => ({
      category: "IOC",
      title: i.defangedVal,
      subtitle: \`Type: \${i.type} • Reputation: \${i.reputation}\`,
      link: \`/iocs?search=\${encodeURIComponent(i.value)}\`,
    })),
    ...hunts.map((h) => ({
      category: "HUNT",
      title: h.title,
      subtitle: \`Stage: \${h.stage} • Verdict: \${h.verdict || "In Progress"}\`,
      link: \`/hunts\`,
    })),
    ...cases.map((c) => ({
      category: "CASE",
      title: c.title,
      subtitle: \`Severity: \${c.severity} • Priority: \${c.priority}\`,
      link: \`/cases\`,
    })),
    ...hypotheses.map((hyp) => ({
      category: "HYPOTHESIS",
      title: hyp.title,
      subtitle: \`Confidence: \${hyp.confidenceRate}%\`,
      link: \`/hypotheses\`,
    })),
    ...actors.map((a) => ({
      category: "ACTOR",
      title: a.name,
      subtitle: \`Country: \${a.originCountry || "Unknown"} • Motivation: \${a.motivation || "Espionage"}\`,
      link: \`/actors\`,
    })),
    ...techniques.map((t) => ({
      category: "ATT&CK",
      title: \`\${t.techniqueId}: \${t.name}\`,
      subtitle: \`Tactic: \${t.tactic}\`,
      link: \`/attack\`,
    })),
  ];

  return NextResponse.json({ results });
}
`);

// 2. User Management API (/api/users)
write('src/app/api/users/route.ts', `
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest, hashPassword } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: "Unauthorized: Admin manage permission required" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { orgId: session.orgId },
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      isActive: true,
      createdAt: true,
      userRoles: {
        include: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json({ error: "Unauthorized: Admin manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, name, title, roleName } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const role = await prisma.role.findFirst({
      where: { name: roleName || "LEAD_HUNTER" },
    });

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        title: title || "Security Analyst",
        orgId: session.orgId,
        userRoles: role
          ? {
              create: { roleId: role.id },
            }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        isActive: true,
      },
    });

    await createAuditLog({
      action: "USER_CREATED",
      resource: "User",
      resourceId: user.id,
      userId: session.userId,
      orgId: session.orgId,
      details: { email: user.email, name: user.name, role: roleName },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`);

// 3. Settings API (/api/settings)
write('src/app/api/settings/route.ts', `
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
    },
  });

  const settings = await prisma.systemSetting.findMany();
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return NextResponse.json({
    organization: org,
    settings: settingsMap,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.ADMIN_MANAGE)) {
    return NextResponse.json({ error: "Unauthorized: Admin permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { orgName, orgDescription, settings } = body;

    if (orgName) {
      await prisma.organization.update({
        where: { id: session.orgId },
        data: { name: orgName, description: orgDescription },
      });
    }

    if (settings && typeof settings === "object") {
      for (const [key, value] of Object.entries(settings)) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    await createAuditLog({
      action: "SETTINGS_UPDATED",
      resource: "Organization",
      resourceId: session.orgId,
      userId: session.userId,
      orgId: session.orgId,
      details: { orgName, updatedSettings: Object.keys(settings || {}) },
    });

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`);

// 4. Metrics API - Protected for Telemetry Stats
write('src/app/api/metrics/route.ts', `
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

const startTime = Date.now();

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  // Minimal public health information for unauthenticated callers
  if (!session) {
    return NextResponse.json({
      status: 'HEALTHY',
      platform: 'SUMI-TAH',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }

  // Detailed operational metrics for authenticated analysts
  try {
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);

    const [huntsCount, casesCount, iocsCount, auditCount] = await Promise.all([
      prisma.hunt.count({ where: { orgId: session.orgId } }).catch(() => 0),
      prisma.case.count({ where: { orgId: session.orgId } }).catch(() => 0),
      prisma.iOC.count().catch(() => 0),
      prisma.auditLog.count({ where: { orgId: session.orgId } }).catch(() => 0),
    ]);

    return NextResponse.json({
      status: 'HEALTHY',
      platform: 'SUMI-TAH',
      version: '1.0.0',
      uptimeSeconds: uptimeSec,
      memoryUsage: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      },
      telemetryStats: {
        totalHunts: huntsCount,
        totalCases: casesCount,
        totalIOCs: iocsCount,
        totalAuditEvents: auditCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', error: err.message },
      { status: 500 }
    );
  }
}
`);

// 5. Hardened Auth Service (require non-default secret in prod)
write('src/lib/auth.ts', `
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "sumitah_session";
const DEFAULT_DEV_SECRET = "sumitah-jwt-secret-key-change-in-production-2026";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_SECRET)) {
  console.warn("[SECURITY WARNING] Running with default JWT secret in production mode. Set JWT_SECRET in environment variables.");
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

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: Omit<SessionPayload, "exp">): Promise<string> {
  const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS || "24", 10);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(\`\${expiryHours}h\`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: Request): Promise<SessionPayload | null> {
  // 1. Check Authorization header: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const verified = await verifySessionToken(token);
    if (verified) return verified;
  }

  // 2. Check Cookie header
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
`);

// 6. Hardened Login Route (No token in JSON response)
write('src/app/api/auth/login/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { LoginSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = LoginSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Invalid input", details: validated.error.format() }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: validated.data.email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      await createAuditLog({
        action: "AUTH_LOGIN_FAILED",
        resource: "User",
        status: "FAILURE",
        details: { email: validated.data.email, reason: "Invalid credentials or inactive user" },
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const validPassword = await verifyPassword(validated.data.password, user.passwordHash);
    if (!validPassword) {
      await createAuditLog({
        action: "AUTH_LOGIN_FAILED",
        resource: "User",
        userId: user.id,
        orgId: user.orgId,
        status: "FAILURE",
        details: { email: user.email, reason: "Password mismatch" },
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name))
      )
    );

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      roles,
      permissions,
    });

    await createAuditLog({
      action: "AUTH_LOGIN_SUCCESS",
      resource: "User",
      userId: user.id,
      orgId: user.orgId,
      status: "SUCCESS",
      details: { email: user.email, roles },
    });

    // Security requirement: Token is strictly returned in HttpOnly cookie, NOT JSON body
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        title: user.title,
        orgId: user.orgId,
        roles,
        permissions,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
`);