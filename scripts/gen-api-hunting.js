const { write } = require('./writer');

write('src/app/api/hypotheses/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { HypothesisSchema } from "@/lib/validation";
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
      hunts: { select: { id: true, title: true, stage: true, verdict: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(hypotheses);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = HypothesisSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid hypothesis payload", details: validated.error.format() }, { status: 400 });
  }

  const hypothesis = await prisma.hypothesis.create({
    data: {
      orgId: session.orgId,
      authorId: session.userId,
      title: validated.data.title,
      statement: validated.data.statement,
      rationale: validated.data.rationale,
      status: validated.data.status,
      confidence: validated.data.confidence,
      attackTags: validated.data.attackTags ? JSON.stringify(validated.data.attackTags) : null,
    },
  });

  await createAuditLog({
    action: "HYPOTHESIS_CREATED",
    resource: "Hypothesis",
    resourceId: hypothesis.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: hypothesis.title },
  });

  return NextResponse.json(hypothesis, { status: 201 });
}
`);

write('src/app/api/hypotheses/[id]/route.ts', `
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

  const hypothesis = await prisma.hypothesis.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      hunts: {
        include: {
          lead: { select: { name: true } },
          findings: true,
        },
      },
    },
  });

  if (!hypothesis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(hypothesis);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.hypothesis.update({
    where: { id: params.id },
    data: {
      title: body.title,
      statement: body.statement,
      rationale: body.rationale,
      status: body.status,
      confidence: body.confidence,
      attackTags: body.attackTags ? JSON.stringify(body.attackTags) : undefined,
    },
  });

  await createAuditLog({
    action: "HYPOTHESIS_UPDATED",
    resource: "Hypothesis",
    resourceId: params.id,
    userId: session.userId,
    orgId: session.orgId,
  });

  return NextResponse.json(updated);
}
`);

write('src/app/api/hunts/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { HuntSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HUNTS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const hunts = await prisma.hunt.findMany({
    where: { orgId: session.orgId },
    include: {
      hypothesis: { select: { id: true, title: true, attackTags: true } },
      lead: { select: { id: true, name: true } },
      findings: true,
      evidence: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(hunts);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HUNTS_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = HuntSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid hunt payload", details: validated.error.format() }, { status: 400 });
  }

  const hunt = await prisma.hunt.create({
    data: {
      orgId: session.orgId,
      hypothesisId: validated.data.hypothesisId,
      packageId: validated.data.packageId,
      leadId: session.userId,
      title: validated.data.title,
      description: validated.data.description,
      stage: validated.data.stage,
      telemetryReq: validated.data.telemetryReq,
      verdict: validated.data.verdict,
      conclusion: validated.data.conclusion,
      startedAt: validated.data.stage === "ACTIVE" ? new Date() : null,
    },
  });

  await createAuditLog({
    action: "HUNT_CREATED",
    resource: "Hunt",
    resourceId: hunt.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: hunt.title, stage: hunt.stage },
  });

  return NextResponse.json(hunt, { status: 201 });
}
`);

write('src/app/api/hunts/[id]/route.ts', `
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

  const hunt = await prisma.hunt.findUnique({
    where: { id: params.id },
    include: {
      hypothesis: true,
      huntPackage: true,
      lead: { select: { id: true, name: true, email: true } },
      executions: { orderBy: { executedAt: "desc" } },
      findings: { include: { evidence: true } },
      evidence: true,
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

  const body = await req.json();
  const updateData: any = {};
  if (body.stage) updateData.stage = body.stage;
  if (body.verdict) updateData.verdict = body.verdict;
  if (body.conclusion !== undefined) updateData.conclusion = body.conclusion;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.telemetryReq !== undefined) updateData.telemetryReq = body.telemetryReq;

  if (body.stage === "COMPLETED" && !updateData.completedAt) {
    updateData.completedAt = new Date();
  }

  const updated = await prisma.hunt.update({
    where: { id: params.id },
    data: updateData,
  });

  await createAuditLog({
    action: "HUNT_STAGE_UPDATED",
    resource: "Hunt",
    resourceId: params.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { stage: updated.stage, verdict: updated.verdict },
  });

  return NextResponse.json(updated);
}
`);

write('src/app/api/hunts/[id]/findings/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { FindingSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HUNTS_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = FindingSchema.safeParse({ ...body, huntId: params.id });
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid finding", details: validated.error.format() }, { status: 400 });
  }

  const finding = await prisma.finding.create({
    data: {
      huntId: params.id,
      title: validated.data.title,
      description: validated.data.description,
      severity: validated.data.severity,
      status: validated.data.status,
      rawEvent: validated.data.rawEvent,
    },
  });

  await createAuditLog({
    action: "HUNT_FINDING_RECORDED",
    resource: "Finding",
    resourceId: finding.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { huntId: params.id, title: finding.title, severity: finding.severity },
  });

  return NextResponse.json(finding, { status: 201 });
}
`);

write('src/app/api/hunt-packages/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HUNTS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const packages = await prisma.huntPackage.findMany({
    orderBy: { category: "asc" },
  });

  return NextResponse.json(packages);
}
`);

write('src/app/api/queries/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { QuerySchema } from "@/lib/validation";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.QUERIES_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const queries = await prisma.query.findMany({
    include: {
      author: { select: { name: true, email: true } },
      versions: { orderBy: { versionNum: "desc" } },
      executions: { take: 5, orderBy: { executedAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(queries);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.QUERIES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = QuerySchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid query payload", details: validated.error.format() }, { status: 400 });
  }

  const query = await prisma.query.create({
    data: {
      title: validated.data.title,
      description: validated.data.description,
      siemType: validated.data.siemType,
      language: validated.data.language,
      content: validated.data.content,
      attackTags: validated.data.attackTags ? JSON.stringify(validated.data.attackTags) : null,
      authorId: session.userId,
    },
  });

  await prisma.queryVersion.create({
    data: {
      queryId: query.id,
      versionNum: 1,
      content: query.content,
      changeLog: "Initial query baseline",
    },
  });

  return NextResponse.json(query, { status: 201 });
}
`);

write('src/app/api/queries/execute/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { QueryExecutionSchema } from "@/lib/validation";
import { getConnector } from "@/lib/connectors";
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

  const providerMap: Record<string, "logscale" | "sentinel" | "splunk" | "falcon"> = {
    LOGSCALE: "logscale",
    SENTINEL: "sentinel",
    SPLUNK: "splunk",
    ELASTIC: "splunk",
  };

  const provider = providerMap[validated.data.siemType] || "splunk";

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