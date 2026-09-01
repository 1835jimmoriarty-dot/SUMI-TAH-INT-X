export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { HypothesisCreateSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const hypotheses = await prisma.hypothesis.findMany({
    where: { orgId: session.orgId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      hunts: { select: { id: true, title: true, stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(hypotheses);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = HypothesisCreateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Invalid hypothesis payload", details: validated.error.format() },
      { status: 400 }
    );
  }

  const created = await prisma.hypothesis.create({
    data: {
      title: validated.data.title,
      statement: validated.data.statement,
      rationale: validated.data.rationale,
      confidence: validated.data.confidence ?? "MEDIUM",
      status: validated.data.status ?? "DRAFT",
      attackTags: JSON.stringify(validated.data.attackTags || []),
      authorId: session.userId,
      orgId: session.orgId,
    },
  });

  await createAuditLog({
    action: "HYPOTHESIS_CREATED",
    resource: "Hypothesis",
    resourceId: created.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: created.title },
  });

  return NextResponse.json(created, { status: 201 });
}