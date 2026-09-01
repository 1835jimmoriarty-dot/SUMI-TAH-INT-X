import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INTEL_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const actors = await prisma.threatActor.findMany({
    include: {
      aliases: true,
      campaigns: { include: { malware: true } },
    },
    orderBy: { confidenceRate: "desc" },
  });

  return NextResponse.json(actors);
}