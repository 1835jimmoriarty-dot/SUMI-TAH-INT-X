const { write } = require('./writer');

write('src/app/api/ai/analyze/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { getAIProvider } from "@/lib/ai";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const provider = getAIProvider();

  const response = await provider.analyze({
    capability: body.capability || "HUNT_SUMMARY",
    prompt: body.prompt || "Analyze threat hunting telemetry",
    contextData: body.contextData,
  });

  await prisma.aIActivity.create({
    data: {
      capability: response.capability,
      prompt: body.prompt || "",
      response: JSON.stringify(response),
      isAdvisory: true,
      userId: session.userId,
    },
  });

  await createAuditLog({
    action: "AI_ADVISORY_CONSULTED",
    resource: "AIActivity",
    userId: session.userId,
    details: { capability: response.capability },
  });

  return NextResponse.json(response);
}
`);

write('src/app/api/soar/actions/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { SOARActionRequestSchema } from "@/lib/validation";
import { requestSOARAction, SOAR_ACTION_DEFINITIONS } from "@/lib/soar";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const actions = await prisma.sOARAction.findMany({
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      case: { select: { id: true, title: true, severity: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({
    actions,
    definitions: Object.values(SOAR_ACTION_DEFINITIONS),
  });
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_REQUEST)) {
    return NextResponse.json({ error: "Unauthorized: SOAR request permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = SOARActionRequestSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid SOAR action payload", details: validated.error.format() }, { status: 400 });
  }

  const actionId = await requestSOARAction({
    caseId: validated.data.caseId || undefined,
    actionType: validated.data.actionType,
    target: validated.data.target,
    parameters: validated.data.parameters,
    rationale: validated.data.rationale,
    requesterId: session.userId,
  });

  return NextResponse.json({
    success: true,
    actionId,
    status: "PENDING_APPROVAL",
    message: "Action queued successfully. Mandatory analyst approval is required prior to execution.",
  }, { status: 201 });
}
`);

write('src/app/api/soar/actions/[id]/approve/route.ts', `
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { SOARActionApprovalSchema } from "@/lib/validation";
import { approveAndExecuteSOARAction, rejectSOARAction } from "@/lib/soar";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_APPROVE)) {
    return NextResponse.json({ error: "Unauthorized: SOAR Approval permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = SOARActionApprovalSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid approval payload", details: validated.error.format() }, { status: 400 });
  }

  if (validated.data.approved) {
    const result = await approveAndExecuteSOARAction({
      actionId: params.id,
      approverId: session.userId,
      approverName: session.name,
      comments: validated.data.comments,
    });
    return NextResponse.json({ success: true, ...result });
  } else {
    await rejectSOARAction({
      actionId: params.id,
      approverId: session.userId,
      reason: validated.data.comments || "Rejected by security analyst",
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }
}
`);

write('src/app/api/integrations/route.ts', `
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
`);

write('src/app/api/integrations/[id]/test/route.ts', `
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
`);