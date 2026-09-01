export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { SOARActionRequestSchema } from "@/lib/validation";
import { requestSOARAction } from "@/lib/soar";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const actions = await prisma.sOARAction.findMany({
    where: {
      requester: { orgId: session.orgId },
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      case: { select: { id: true, title: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ actions });
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_REQUEST)) {
    return NextResponse.json({ error: "Unauthorized: SOAR request permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = SOARActionRequestSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid SOAR request payload", details: validated.error.format() }, { status: 400 });
  }

  // If linked to a case, verify case organization
  if (validated.data.caseId) {
    const linkedCase = await prisma.case.findFirst({
      where: { id: validated.data.caseId, orgId: session.orgId },
    });
    if (!linkedCase) {
      return NextResponse.json({ error: "Linked case does not exist in your organization" }, { status: 404 });
    }
  }

  const actionId = await requestSOARAction({
    caseId: validated.data.caseId || undefined,
    actionType: validated.data.actionType,
    target: validated.data.target,
    parameters: validated.data.parameters,
    rationale: validated.data.rationale,
    requesterId: session.userId,
  });

  return NextResponse.json({ success: true, actionId, status: "PENDING_APPROVAL" }, { status: 201 });
}