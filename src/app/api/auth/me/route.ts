export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      orgId: true,
      organization: { select: { name: true, slug: true } },
    },
  });

  return NextResponse.json({
    authenticated: true,
    user: {
      ...user,
      roles: session.roles,
      permissions: session.permissions,
    },
  });
}