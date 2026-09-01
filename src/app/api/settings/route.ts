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
    select: { id: true, name: true, slug: true, description: true, createdAt: true },
  });

  const settingsRows = await prisma.systemSetting.findMany();
  const settings = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));

  return NextResponse.json({ organization: org, settings });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.ADMIN_MANAGE)) {
    return NextResponse.json(
      { error: "Unauthorized: admin:manage permission required" },
      { status: 403 }
    );
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
      details: {
        orgName,
        updatedSettings: Object.keys(settings || {}),
      },
    });

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}