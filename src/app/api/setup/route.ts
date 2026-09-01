export const dynamic = 'force-dynamic';
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