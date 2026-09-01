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