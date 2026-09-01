export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { IntegrationConfigSchema } from "@/lib/validation";
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
      healthLogs: { take: 1, orderBy: { checkedAt: "desc" } },
      secrets: { select: { keyName: true } },
    },
  });

  return NextResponse.json(integrations);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INTEGRATIONS_MANAGE)) {
    return NextResponse.json({ error: "Unauthorized: Integrations management permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = IntegrationConfigSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid integration config", details: validated.error.format() }, { status: 400 });
  }

  const integration = await prisma.integration.create({
    data: {
      orgId: session.orgId,
      provider: validated.data.provider,
      name: validated.data.name,
      description: validated.data.description,
      isEnabled: validated.data.isEnabled,
      configJson: JSON.stringify(validated.data.config),
    },
  });

  if (validated.data.secrets) {
    for (const [keyName, secretValue] of Object.entries(validated.data.secrets)) {
      if (secretValue) {
        const encrypted = encryptSecret(secretValue);
        await prisma.integrationSecret.create({
          data: {
            integrationId: integration.id,
            keyName,
            encryptedData: encrypted.encryptedData,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
          },
        });
      }
    }
  }

  await createAuditLog({
    action: "INTEGRATION_CREATED",
    resource: "Integration",
    resourceId: integration.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { provider: integration.provider, name: integration.name },
  });

  return NextResponse.json(integration, { status: 201 });
}