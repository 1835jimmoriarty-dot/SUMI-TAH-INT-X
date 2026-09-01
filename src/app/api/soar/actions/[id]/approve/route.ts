export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { SOARActionApprovalSchema } from "@/lib/validation";
import { approveAndExecuteSOARAction, rejectSOARAction } from "@/lib/soar";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.SOAR_APPROVE)) {
    return NextResponse.json({ error: "Unauthorized: SOAR Approval permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = SOARActionApprovalSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid approval payload", details: validated.error.format() }, { status: 400 });
  }

  if (validated.data.approved) {
    const result = await approveAndExecuteSOARAction({
      actionId: params.id,
      approverId: session.userId,
      approverName: session.name,
      comments: validated.data.comments,
    });
    return NextResponse.json({ success: true, ...result });
  } else {
    await rejectSOARAction({
      actionId: params.id,
      approverId: session.userId,
      reason: validated.data.comments || "Rejected by security analyst",
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }
}