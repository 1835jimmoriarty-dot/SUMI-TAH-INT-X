export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { QueryExecutionSchema } from "@/lib/validation";
import { getConnector, ConnectorProvider } from "@/lib/connectors";
import { decryptSecret } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.QUERIES_EXECUTE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = QueryExecutionSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid execution payload", details: validated.error.format() }, { status: 400 });
  }

  const providerMap: Record<string, ConnectorProvider> = {
    LOGSCALE: "logscale",
    SENTINEL: "sentinel",
    SPLUNK: "splunk",
    ELASTIC: "elastic",
    FALCON: "falcon",
  };

  const provider = providerMap[validated.data.siemType];
  if (!provider) {
    return NextResponse.json({ error: `Unsupported SIEM type: ${validated.data.siemType}` }, { status: 400 });
  }

  const integration = await prisma.integration.findFirst({
    where: { orgId: session.orgId, provider },
    include: { secrets: true },
  });

  let config = {};
  let secrets: Record<string, string> = {};

  if (integration && integration.isEnabled) {
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
      console.error("Failed to decrypt integration secret:", err);
    }
  }

  const connector = getConnector(provider, config, secrets);
  const result = await connector.execute({
    query: validated.data.rawQuery,
    timeRange: validated.data.timeRange,
    limit: validated.data.limit,
  });

  const execution = await prisma.queryExecution.create({
    data: {
      queryId: validated.data.queryId,
      huntId: validated.data.huntId,
      siemType: validated.data.siemType,
      rawQuery: validated.data.rawQuery,
      status: result.success ? "COMPLETED" : "FAILED",
      durationMs: result.executionTimeMs,
      matchCount: result.matchCount,
      resultJson: JSON.stringify(result.events),
      isDemoData: result.isDemoData,
    },
  });

  await createAuditLog({
    action: "QUERY_EXECUTED",
    resource: "QueryExecution",
    resourceId: execution.id,
    userId: session.userId,
    orgId: session.orgId,
    details: {
      siemType: validated.data.siemType,
      matchCount: result.matchCount,
      success: result.success,
    },
  });

  return NextResponse.json({
    executionId: execution.id,
    ...result,
  });
}