import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { HypothesisSchema } from "@/lib/validation";
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
      hunts: { select: { id: true, title: true, stage: true, verdict: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(hypotheses);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.HYPOTHESES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = HypothesisSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid hypothesis payload", details: validated.error.format() }, { status: 400 });
  }

  const hypothesis = await prisma.hypothesis.create({
    data: {
      orgId: session.orgId,
      authorId: session.userId,
      title: validated.data.title,
      statement: validated.data.statement,
      rationale: validated.data.rationale,
      status: validated.data.status,
      confidence: validated.data.confidence,
      attackTags: validated.data.attackTags ? JSON.stringify(validated.data.attackTags) : null,
    },
  });

  await createAuditLog({
    action: "HYPOTHESIS_CREATED",
    resource: "Hypothesis",
    resourceId: hypothesis.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: hypothesis.title },
  });

  return NextResponse.json(hypothesis, { status: 201 });
}