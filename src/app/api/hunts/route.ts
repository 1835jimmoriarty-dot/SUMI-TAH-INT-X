export const dynamic = 'force-dynamic';
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