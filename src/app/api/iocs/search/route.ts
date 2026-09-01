export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { normalizeIOC, extractAllIOCs } from "@/lib/ioc-engine";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.IOCS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const query = body.query || "";
  const normalized = normalizeIOC(query);
  const extracted = extractAllIOCs(query);

  const directMatches = await prisma.iOC.findMany({
    where: {
      OR: [
        { value: { contains: normalized } },
        { normalizedVal: { contains: normalized.toLowerCase() } },
        { defangedVal: { contains: query } },
      ],
    },
    include: {
      observations: { take: 5, orderBy: { observedAt: "desc" } },
      verdicts: true,
    },
    take: 20,
  });

  return NextResponse.json({
    query,
    normalized,
    extractedIndicators: extracted,
    matches: directMatches,
  });
}