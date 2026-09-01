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
      details: `Status: ${updated.status}, Severity: ${updated.severity}, Verdict: ${updated.verdict || "Pending"}`,
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