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