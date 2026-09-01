export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import crypto from "crypto";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { EvidenceSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.EVIDENCE_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const evidence = await prisma.evidence.findMany({
    include: {
      hunt: { select: { id: true, title: true } },
      case: { select: { id: true, title: true } },
      finding: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(evidence);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.EVIDENCE_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = EvidenceSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid evidence payload", details: validated.error.format() }, { status: 400 });
  }

  // Calculate cryptographic SHA-256 integrity hash
  const hash = crypto.createHash("sha256").update(validated.data.content).digest("hex");

  const evidence = await prisma.evidence.create({
    data: {
      huntId: validated.data.huntId,
      caseId: validated.data.caseId,
      findingId: validated.data.findingId,
      title: validated.data.title,
      type: validated.data.type,
      content: validated.data.content,
      sha256Hash: hash,
      metadata: validated.data.metadata ? JSON.stringify(validated.data.metadata) : null,
    },
  });

  await createAuditLog({
    action: "EVIDENCE_ATTACHED",
    resource: "Evidence",
    resourceId: evidence.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: evidence.title, type: evidence.type, sha256Hash: hash },
  });

  return NextResponse.json(evidence, { status: 201 });
}