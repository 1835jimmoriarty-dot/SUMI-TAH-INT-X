export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { encryptSecret } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INTEGRATIONS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const integrations = await prisma.integration.findMany({
    where: { orgId: session.orgId },
    include: {
      healthLogs: { orderBy: { checkedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(integrations);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INTEGRATIONS_MANAGE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, provider, description, config, secrets } = body;

    if (!name || !provider) {
      return NextResponse.json({ error: "Name and provider are required" }, { status: 400 });
    }

    const created = await prisma.integration.create({
      data: {
        name,
        provider: provider.toLowerCase(),
        description: description || "",
        configJson: JSON.stringify(config || {}),
        isEnabled: true,
        orgId: session.orgId,
      },
    });

    if (secrets && typeof secrets === "object") {
      for (const [keyName, secretVal] of Object.entries(secrets)) {
        if (typeof secretVal === "string" && secretVal.trim()) {
          const enc = encryptSecret(secretVal.trim());
          await prisma.integrationSecret.create({
            data: {
              integrationId: created.id,
              keyName,
              encryptedData: enc.encryptedData,
              iv: enc.iv,
              authTag: enc.authTag,
            },
          });
        }
      }
    }

    await createAuditLog({
      action: "INTEGRATION_CREATED",
      resource: "Integration",
      resourceId: created.id,
      userId: session.userId,
      orgId: session.orgId,
      details: { name: created.name, provider: created.provider },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}