export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { normalizeIOC, defangIOC, detectIOCType, calculateReputationScore } from "@/lib/ioc-engine";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.IOCS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const reputation = searchParams.get("reputation");

  const whereClause: any = {};
  if (type) whereClause.type = type.toUpperCase();
  if (reputation) whereClause.reputation = reputation.toUpperCase();

  const iocs = await prisma.iOC.findMany({
    where: whereClause,
    include: {
      observations: { take: 5, orderBy: { observedAt: "desc" } },
      verdicts: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(iocs);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.IOCS_WRITE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const norm = normalizeIOC(body.value);
  const detectedType = body.type || detectIOCType(norm);

  if (!detectedType) {
    return NextResponse.json({ error: "Unable to detect valid IOC type for: " + body.value }, { status: 400 });
  }

  const breakdown = calculateReputationScore({
    type: detectedType as any,
    observationsCount: 1,
    providerVerdicts: body.verdicts || [],
  });

  const ioc = await prisma.iOC.upsert({
    where: { value: norm },
    update: {
      lastSeen: new Date(),
    },
    create: {
      type: detectedType,
      value: norm,
      normalizedVal: norm.toLowerCase(),
      defangedVal: defangIOC(norm),
      reputation: breakdown.reputation,
      score: breakdown.score,
      confidence: breakdown.confidence,
      scoreReasoning: JSON.stringify(breakdown.reasoning),
      tags: body.tags ? JSON.stringify(body.tags) : null,
    },
  });

  return NextResponse.json(ioc, { status: 201 });
}