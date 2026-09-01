const { write } = require('./writer');

// 1. Queries execute route
write('src/app/api/queries/execute/route.ts', `
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
    return NextResponse.json({ error: \`Unsupported SIEM type: \${validated.data.siemType}\` }, { status: 400 });
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
`);

// 2. Cases Route
write('src/app/api/cases/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { CaseCreateSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.CASES_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const cases = await prisma.case.findMany({
    where: { orgId: session.orgId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      hunt: { select: { id: true, title: true } },
      comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      actions: { orderBy: { createdAt: "desc" } },
      evidence: true,
      soarActions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cases);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.CASES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = CaseCreateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid case data", details: validated.error.format() }, { status: 400 });
  }

  const created = await prisma.case.create({
    data: {
      title: validated.data.title,
      description: validated.data.description,
      severity: validated.data.severity,
      priority: validated.data.priority,
      status: "OPEN",
      huntId: validated.data.huntId,
      assigneeId: validated.data.assigneeId || session.userId,
      orgId: session.orgId,
    },
  });

  await prisma.caseAction.create({
    data: {
      caseId: created.id,
      actorName: session.name,
      action: "Created Incident Case",
      details: \`Initial severity: \${created.severity}, Priority: \${created.priority}\`,
    },
  });

  await createAuditLog({
    action: "CASE_CREATED",
    resource: "Case",
    resourceId: created.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: created.title, severity: created.severity },
  });

  return NextResponse.json(created, { status: 201 });
}
`);

// 3. Cases [id] Route
write('src/app/api/cases/[id]/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.CASES_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const caseItem = await prisma.case.findFirst({
    where: { id: params.id, orgId: session.orgId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      hunt: { include: { findings: true, hypothesis: true } },
      comments: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      actions: { orderBy: { createdAt: "desc" } },
      evidence: true,
      soarActions: { include: { requester: { select: { name: true } }, approver: { select: { name: true } } } },
    },
  });

  if (!caseItem) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  return NextResponse.json(caseItem);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.CASES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.case.findFirst({
    where: { id: params.id, orgId: session.orgId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.case.update({
    where: { id: params.id },
    data: {
      status: body.status,
      severity: body.severity,
      priority: body.priority,
      verdict: body.verdict,
      summary: body.summary,
      assigneeId: body.assigneeId,
    },
  });

  await prisma.caseAction.create({
    data: {
      caseId: params.id,
      actorName: session.name,
      action: "Updated Case Properties",
      details: \`Status: \${updated.status}, Severity: \${updated.severity}, Verdict: \${updated.verdict || "Pending"}\`,
    },
  });

  await createAuditLog({
    action: "CASE_UPDATED",
    resource: "Case",
    resourceId: params.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { status: updated.status, severity: updated.severity },
  });

  return NextResponse.json(updated);
}
`);

// 4. Cases [id] Comments Route
write('src/app/api/cases/[id]/comments/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.CASES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existingCase = await prisma.case.findFirst({
    where: { id: params.id, orgId: session.orgId },
  });

  if (!existingCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const body = await req.json();
  if (!body.comment || typeof body.comment !== "string") {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  const created = await prisma.caseComment.create({
    data: {
      caseId: params.id,
      authorId: session.userId,
      comment: body.comment,
    },
    include: {
      author: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
`);

// 5. Hunts Routes
write('src/app/api/hunts/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { HuntCreateSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HUNTS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const hunts = await prisma.hunt.findMany({
    where: { orgId: session.orgId },
    include: {
      lead: { select: { id: true, name: true, email: true } },
      hypothesis: true,
      findings: true,
      cases: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(hunts);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HUNTS_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = HuntCreateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid hunt payload", details: validated.error.format() }, { status: 400 });
  }

  const hunt = await prisma.hunt.create({
    data: {
      title: validated.data.title,
      description: validated.data.description,
      stage: "PLANNING",
      hypothesisId: validated.data.hypothesisId,
      huntPackageId: validated.data.huntPackageId,
      leadId: validated.data.leadId || session.userId,
      orgId: session.orgId,
    },
  });

  await createAuditLog({
    action: "HUNT_CREATED",
    resource: "Hunt",
    resourceId: hunt.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: hunt.title },
  });

  return NextResponse.json(hunt, { status: 201 });
}
`);

// 6. Hunts [id] Route
write('src/app/api/hunts/[id]/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HUNTS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const hunt = await prisma.hunt.findFirst({
    where: { id: params.id, orgId: session.orgId },
    include: {
      lead: { select: { id: true, name: true, email: true } },
      hypothesis: true,
      findings: { include: { evidence: true } },
      cases: true,
    },
  });

  if (!hunt) return NextResponse.json({ error: "Hunt not found" }, { status: 404 });
  return NextResponse.json(hunt);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HUNTS_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.hunt.findFirst({
    where: { id: params.id, orgId: session.orgId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Hunt not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.hunt.update({
    where: { id: params.id },
    data: {
      stage: body.stage,
      verdict: body.verdict,
      conclusion: body.conclusion,
      leadId: body.leadId,
    },
  });

  await createAuditLog({
    action: "HUNT_UPDATED",
    resource: "Hunt",
    resourceId: params.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { stage: updated.stage, verdict: updated.verdict },
  });

  return NextResponse.json(updated);
}
`);

// 7. Hypotheses Route
write('src/app/api/hypotheses/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { HypothesisCreateSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const hypotheses = await prisma.hypothesis.findMany({
    where: { orgId: session.orgId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      hunts: { select: { id: true, title: true, stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(hypotheses);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = HypothesisCreateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid hypothesis payload", details: validated.error.format() }, { status: 400 });
  }

  const created = await prisma.hypothesis.create({
    data: {
      title: validated.data.title,
      summary: validated.data.summary,
      threatProfile: validated.data.threatProfile,
      confidenceRate: validated.data.confidenceRate || 50,
      attackTags: JSON.stringify(validated.data.attackTags || []),
      authorId: session.userId,
      orgId: session.orgId,
    },
  });

  await createAuditLog({
    action: "HYPOTHESIS_CREATED",
    resource: "Hypothesis",
    resourceId: created.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: created.title },
  });

  return NextResponse.json(created, { status: 201 });
}
`);

// 8. Hypotheses [id] Route
write('src/app/api/hypotheses/[id]/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const hypothesis = await prisma.hypothesis.findFirst({
    where: { id: params.id, orgId: session.orgId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      hunts: true,
    },
  });

  if (!hypothesis) return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 });
  return NextResponse.json(hypothesis);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existing = await prisma.hypothesis.findFirst({
    where: { id: params.id, orgId: session.orgId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.hypothesis.update({
    where: { id: params.id },
    data: {
      status: body.status,
      confidenceRate: body.confidenceRate,
      summary: body.summary,
    },
  });

  await createAuditLog({
    action: "HYPOTHESIS_UPDATED",
    resource: "Hypothesis",
    resourceId: params.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { status: updated.status },
  });

  return NextResponse.json(updated);
}
`);

// 9. SOAR Actions Route
write('src/app/api/soar/actions/route.ts', `
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { SOARActionRequestSchema } from "@/lib/validation";
import { requestSOARAction } from "@/lib/soar";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const actions = await prisma.sOARAction.findMany({
    where: {
      requester: { orgId: session.orgId },
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      case: { select: { id: true, title: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ actions });
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_REQUEST)) {
    return NextResponse.json({ error: "Unauthorized: SOAR request permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = SOARActionRequestSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid SOAR request payload", details: validated.error.format() }, { status: 400 });
  }

  // If linked to a case, verify case organization
  if (validated.data.caseId) {
    const linkedCase = await prisma.case.findFirst({
      where: { id: validated.data.caseId, orgId: session.orgId },
    });
    if (!linkedCase) {
      return NextResponse.json({ error: "Linked case does not exist in your organization" }, { status: 404 });
    }
  }

  const actionId = await requestSOARAction({
    caseId: validated.data.caseId,
    actionType: validated.data.actionType,
    target: validated.data.target,
    parameters: validated.data.parameters,
    rationale: validated.data.rationale,
    requesterId: session.userId,
  });

  return NextResponse.json({ success: true, actionId, status: "PENDING_APPROVAL" }, { status: 201 });
}
`);

// 10. Integrations Route
write('src/app/api/integrations/route.ts', `
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
`);