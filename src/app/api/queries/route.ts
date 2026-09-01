import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { QuerySchema } from "@/lib/validation";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.QUERIES_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const queries = await prisma.query.findMany({
    include: {
      author: { select: { name: true, email: true } },
      versions: { orderBy: { versionNum: "desc" } },
      executions: { take: 5, orderBy: { executedAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(queries);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.QUERIES_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const validated = QuerySchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid query payload", details: validated.error.format() }, { status: 400 });
  }

  const query = await prisma.query.create({
    data: {
      title: validated.data.title,
      description: validated.data.description,
      siemType: validated.data.siemType,
      language: validated.data.language,
      content: validated.data.content,
      attackTags: validated.data.attackTags ? JSON.stringify(validated.data.attackTags) : null,
      authorId: session.userId,
    },
  });

  await prisma.queryVersion.create({
    data: {
      queryId: query.id,
      versionNum: 1,
      content: query.content,
      changeLog: "Initial query baseline",
    },
  });

  return NextResponse.json(query, { status: 201 });
}