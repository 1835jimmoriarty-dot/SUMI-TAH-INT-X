import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { getConnector } from "@/lib/connectors";
import { decryptSecret } from "@/lib/encryption";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INTEGRATIONS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const integration = await prisma.integration.findUnique({
    where: { id: params.id },
    include: { secrets: true },
  });

  if (!integration) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  let config = {};
  let secrets: Record<string, string> = {};
  try {
    config = JSON.parse(integration.configJson);
    integration.secrets.forEach((s) => {
      secrets[s.keyName] = decryptSecret({
        encryptedData: s.encryptedData,
        iv: s.iv,
        authTag: s.authTag,
      });
    });
  } catch (err) {
    console.error("Failed to decrypt integration secret during health test:", err);
  }

  const connector = getConnector(integration.provider as any, config, secrets);
  const healthResult = await connector.health();

  await prisma.connectorHealth.create({
    data: {
      integrationId: integration.id,
      status: healthResult.status,
      latencyMs: healthResult.latencyMs,
      message: healthResult.message,
    },
  });

  return NextResponse.json(healthResult);
}