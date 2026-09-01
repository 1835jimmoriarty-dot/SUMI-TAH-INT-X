export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest, hashPassword } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.USERS_MANAGE)) {
    return NextResponse.json(
      { error: "Unauthorized: users:manage permission required" },
      { status: 403 }
    );
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
    return NextResponse.json(
      { error: "Unauthorized: users:manage permission required" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, password, name, title, roleName } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "email, password, and name are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
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
        userRoles: role ? { create: { roleId: role.id } } : undefined,
      },
      select: { id: true, email: true, name: true, title: true, isActive: true },
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