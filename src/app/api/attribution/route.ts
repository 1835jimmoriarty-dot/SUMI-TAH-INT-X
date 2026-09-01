export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { calculateAttribution } from "@/lib/attribution-engine";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INTEL_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const actors = await prisma.threatActor.findMany({
    include: {
      campaigns: { include: { malware: true } },
    },
  });

  const results = actors.map((actor) => {
    let targetSectors: string[] = [];
    if (actor.targetSectors) {
      try { targetSectors = JSON.parse(actor.targetSectors); } catch {}
    }

    const malwareNames = actor.campaigns.map((c) => c.malware?.name).filter(Boolean) as string[];

    return calculateAttribution({
      actor: {
        id: actor.id,
        name: actor.name,
        targetSectors,
        techniques: ["T1059.001", "T1003.001", "T1558.003", "T1071.001"],
        malwareNames,
      },
      investigation: {
        observedTechniques: body.observedTechniques || [],
        observedMalware: body.observedMalware || [],
        observedIOCs: body.observedIOCs || [],
        victimSector: body.victimSector,
      },
    });
  });

  results.sort((a, b) => b.confidenceScore - a.confidenceScore);

  return NextResponse.json({
    investigationContext: body,
    attributions: results,
  });
}