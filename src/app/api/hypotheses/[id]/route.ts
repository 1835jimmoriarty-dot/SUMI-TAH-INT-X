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

  if (!hypothesis)
    return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 });

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

  // Only update fields that are present in the Prisma schema
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.confidence !== undefined) data.confidence = body.confidence;
  if (body.statement !== undefined) data.statement = body.statement;
  if (body.rationale !== undefined) data.rationale = body.rationale;
  if (body.title !== undefined) data.title = body.title;
  if (body.attackTags !== undefined)
    data.attackTags = JSON.stringify(body.attackTags);

  const updated = await prisma.hypothesis.update({
    where: { id: params.id },
    data,
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