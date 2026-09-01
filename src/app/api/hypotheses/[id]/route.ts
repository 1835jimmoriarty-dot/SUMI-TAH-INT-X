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