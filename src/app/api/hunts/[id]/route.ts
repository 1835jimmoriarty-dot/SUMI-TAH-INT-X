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