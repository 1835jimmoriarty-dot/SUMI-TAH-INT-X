const { write } = require('./writer');

write('src/app/api/health/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw\`SELECT 1\`;
    return NextResponse.json({
      status: "HEALTHY",
      app: "SUMI-TAH",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "CONNECTED",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "UNHEALTHY", database: "DISCONNECTED", error: error.message },
      { status: 503 }
    );
  }
}
`);

write('src/app/api/ready/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      ready: true,
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ ready: false, error: error.message }, { status: 500 });
  }
}
`);

write('src/app/api/auth/login/route.ts', `
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
      token,
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

write('src/app/api/auth/logout/route.ts', `
import { NextResponse } from "next/server";
import { getSessionFromRequest, AUTH_COOKIE_NAME } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (session) {
    await createAuditLog({
      action: "AUTH_LOGOUT",
      resource: "User",
      userId: session.userId,
      orgId: session.orgId,
      status: "SUCCESS",
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
`);

write('src/app/api/auth/me/route.ts', `
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      orgId: true,
      organization: { select: { name: true, slug: true } },
    },
  });

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      roles: session.roles,
      permissions: session.permissions,
    },
  });
}
`);

write('src/app/api/setup/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { SetupSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
import { PERMISSIONS, SYSTEM_ROLES } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const userCount = await prisma.user.count();
  return NextResponse.json({ isInitialized: userCount > 0 });
}

export async function POST(req: Request) {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { error: "SYSTEM_ALREADY_INITIALIZED: Setup wizard has already been executed." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validated = SetupSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Invalid setup payload", details: validated.error.format() }, { status: 400 });
    }

    const org = await prisma.organization.create({
      data: {
        name: validated.data.organizationName,
        slug: validated.data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      },
    });

    for (const permName of Object.values(PERMISSIONS)) {
      const [res, act] = permName.split(":");
      await prisma.permission.upsert({
        where: { name: permName },
        update: {},
        create: { name: permName, resource: res, action: act },
      });
    }

    const adminRole = await prisma.role.upsert({
      where: { name: SYSTEM_ROLES.SECURITY_ADMIN },
      update: {},
      create: {
        name: SYSTEM_ROLES.SECURITY_ADMIN,
        displayName: "Security Administrator",
        isSystem: true,
      },
    });

    const allPerms = await prisma.permission.findMany();
    for (const p of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: p.id },
      });
    }

    const passwordHash = await hashPassword(validated.data.adminPassword);
    const user = await prisma.user.create({
      data: {
        email: validated.data.adminEmail.toLowerCase(),
        name: validated.data.adminName,
        passwordHash,
        orgId: org.id,
      },
    });

    await prisma.userRole.create({
      data: { userId: user.id, roleId: adminRole.id },
    });

    await createAuditLog({
      action: "SYSTEM_SETUP_COMPLETED",
      resource: "System",
      userId: user.id,
      orgId: org.id,
      details: { orgName: org.name, adminEmail: user.email },
    });

    return NextResponse.json({ success: true, message: "System initialized successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`);

write('src/app/api/audit/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.AUDIT_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const logs = await prisma.auditLog.findMany({
    where: { orgId: session.orgId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
`);