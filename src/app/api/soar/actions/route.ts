import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { SOARActionRequestSchema } from "@/lib/validation";
import { requestSOARAction, SOAR_ACTION_DEFINITIONS } from "@/lib/soar";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const actions = await prisma.sOARAction.findMany({
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      case: { select: { id: true, title: true, severity: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({
    actions,
    definitions: Object.values(SOAR_ACTION_DEFINITIONS),
  });
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_REQUEST)) {
    return NextResponse.json({ error: "Unauthorized: SOAR request permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = SOARActionRequestSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid SOAR action payload", details: validated.error.format() }, { status: 400 });
  }

  const actionId = await requestSOARAction({
    caseId: validated.data.caseId || undefined,
    actionType: validated.data.actionType,
    target: validated.data.target,
    parameters: validated.data.parameters,
    rationale: validated.data.rationale,
    requesterId: session.userId,
  });

  return NextResponse.json({
    success: true,
    actionId,
    status: "PENDING_APPROVAL",
    message: "Action queued successfully. Mandatory analyst approval is required prior to execution.",
  }, { status: 201 });
}