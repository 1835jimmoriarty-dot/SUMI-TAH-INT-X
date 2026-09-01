import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.CASES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.comment || typeof body.comment !== "string") {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  const comment = await prisma.caseComment.create({
    data: {
      caseId: params.id,
      authorId: session.userId,
      comment: body.comment,
    },
    include: { author: { select: { name: true } } },
  });

  await prisma.caseAction.create({
    data: {
      caseId: params.id,
      actorName: session.name,
      action: "Added Analyst Note",
      details: body.comment.slice(0, 120),
    },
  });

  return NextResponse.json(comment, { status: 201 });
}