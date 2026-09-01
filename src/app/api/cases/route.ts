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
      details: `Initial severity: ${created.severity}, Priority: ${created.priority}`,
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