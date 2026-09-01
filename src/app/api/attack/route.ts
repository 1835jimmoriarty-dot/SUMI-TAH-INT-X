import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.MITRE_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const techniques = await prisma.mitreAttack.findMany({
    orderBy: [{ tactic: "asc" }, { techniqueId: "asc" }],
  });

  return NextResponse.json(techniques);
}