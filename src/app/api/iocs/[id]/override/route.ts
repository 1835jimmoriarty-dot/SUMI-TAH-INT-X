export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { IOCOverrideSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.IOCS_OVERRIDE)) {
    return NextResponse.json({ error: "Unauthorized: IOC Override permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = IOCOverrideSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid override payload", details: validated.error.format() }, { status: 400 });
  }

  const existing = await prisma.iOC.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "IOC not found" }, { status: 404 });

  const scoreMap: Record<string, number> = {
    MALICIOUS: 95,
    HIGH_RISK: 80,
    SUSPICIOUS: 60,
    UNKNOWN: 30,
    BENIGN: 10,
    ALLOWLISTED: 0,
    CONFLICTING: 50,
  };

  const updated = await prisma.iOC.update({
    where: { id: params.id },
    data: {
      reputation: validated.data.reputation,
      score: scoreMap[validated.data.reputation] ?? 50,
      confidence: 100,
      isOverridden: true,
      overrideReason: validated.data.reason,
      overrideActor: session.name,
      scoreReasoning: JSON.stringify([
        {
          factor: "Analyst Override",
          impact: scoreMap[validated.data.reputation] ?? 50,
          description: `Manual override by ${session.name}: ${validated.data.reason}`,
        },
      ]),
    },
  });

  await createAuditLog({
    action: "IOC_REPUTATION_OVERRIDDEN",
    resource: "IOC",
    resourceId: params.id,
    userId: session.userId,
    orgId: session.orgId,
    details: {
      iocValue: existing.value,
      previousReputation: existing.reputation,
      newReputation: validated.data.reputation,
      reason: validated.data.reason,
    },
  });

  return NextResponse.json(updated);
}