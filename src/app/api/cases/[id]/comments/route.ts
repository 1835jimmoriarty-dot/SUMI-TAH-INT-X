export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.CASES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existingCase = await prisma.case.findFirst({
    where: { id: params.id, orgId: session.orgId },
  });

  if (!existingCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const body = await req.json();
  if (!body.comment || typeof body.comment !== "string") {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  const created = await prisma.caseComment.create({
    data: {
      caseId: params.id,
      authorId: session.userId,
      comment: body.comment,
    },
    include: {
      author: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}