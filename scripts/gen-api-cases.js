const { write } = require('./writer');

write('src/app/api/cases/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { CaseSchema } from "@/lib/validation";
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
      comments: { include: { author: { select: { name: true } } } },
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
  const validated = CaseSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid case payload", details: validated.error.format() }, { status: 400 });
  }

  const newCase = await prisma.case.create({
    data: {
      orgId: session.orgId,
      huntId: validated.data.huntId,
      assigneeId: validated.data.assigneeId || session.userId,
      title: validated.data.title,
      description: validated.data.description,
      severity: validated.data.severity,
      priority: validated.data.priority,
      status: validated.data.status,
      verdict: validated.data.verdict,
      summary: validated.data.summary,
    },
  });

  await prisma.caseAction.create({
    data: {
      caseId: newCase.id,
      actorName: session.name,
      action: "Created Incident Case",
      details: \`Case initialized with \${newCase.severity} severity and \${newCase.priority} priority.\`,
    },
  });

  await createAuditLog({
    action: "CASE_CREATED",
    resource: "Case",
    resourceId: newCase.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: newCase.title, severity: newCase.severity },
  });

  return NextResponse.json(newCase, { status: 201 });
}
`);

write('src/app/api/cases/[id]/route.ts', `
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

  const caseItem = await prisma.case.findUnique({
    where: { id: params.id },
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

write('src/app/api/cases/[id]/comments/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.CASES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.comment || typeof body.comment !== "string") {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  const comment = await prisma.caseComment.create({
    data: {
      caseId: params.id,
      authorId: session.userId,
      comment: body.comment,
    },
    include: { author: { select: { name: true } } },
  });

  await prisma.caseAction.create({
    data: {
      caseId: params.id,
      actorName: session.name,
      action: "Added Analyst Note",
      details: body.comment.slice(0, 120),
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
`);

write('src/app/api/evidence/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import crypto from "crypto";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { EvidenceSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.EVIDENCE_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const evidence = await prisma.evidence.findMany({
    include: {
      hunt: { select: { id: true, title: true } },
      case: { select: { id: true, title: true } },
      finding: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(evidence);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.EVIDENCE_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = EvidenceSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid evidence payload", details: validated.error.format() }, { status: 400 });
  }

  // Calculate cryptographic SHA-256 integrity hash
  const hash = crypto.createHash("sha256").update(validated.data.content).digest("hex");

  const evidence = await prisma.evidence.create({
    data: {
      huntId: validated.data.huntId,
      caseId: validated.data.caseId,
      findingId: validated.data.findingId,
      title: validated.data.title,
      type: validated.data.type,
      content: validated.data.content,
      sha256Hash: hash,
      metadata: validated.data.metadata ? JSON.stringify(validated.data.metadata) : null,
    },
  });

  await createAuditLog({
    action: "EVIDENCE_ATTACHED",
    resource: "Evidence",
    resourceId: evidence.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: evidence.title, type: evidence.type, sha256Hash: hash },
  });

  return NextResponse.json(evidence, { status: 201 });
}
`);

write('src/app/api/reports/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.REPORTS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    where: { orgId: session.orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.REPORTS_GENERATE)) {
    return NextResponse.json({ error: "Unauthorized: Report generation permission required" }, { status: 403 });
  }

  const body = await req.json();
  const report = await prisma.report.create({
    data: {
      orgId: session.orgId,
      title: body.title || "Threat Hunting & Investigation Report",
      type: body.type || "HUNT_REPORT",
      authorName: session.name,
      summary: body.summary || "Comprehensive threat hunt findings and MITRE ATT&CK coverage analysis.",
      contentJson: JSON.stringify(body.content || {}),
      format: body.format || "PDF",
    },
  });

  await createAuditLog({
    action: "REPORT_GENERATED",
    resource: "Report",
    resourceId: report.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: report.title, type: report.type },
  });

  return NextResponse.json(report, { status: 201 });
}
`);