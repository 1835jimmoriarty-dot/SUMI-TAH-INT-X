export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.MITRE_EXPORT)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const techniques = await prisma.mitreAttack.findMany();

  const navigatorLayer = {
    name: "SUMI-TAH Enterprise Threat Hunting Layer",
    versions: {
      attack: "14",
      navigator: "4.3",
      layer: "4.3",
    },
    domain: "enterprise-attack",
    description: "Exported threat detection and hunting coverage from SUMI-TAH platform",
    gradient: {
      colors: ["#18181b", "#064e3b", "#10b981"],
      minValue: 0,
      maxValue: 10,
    },
    techniques: techniques.map((t) => ({
      techniqueID: t.techniqueId,
      tactic: t.tactic.toLowerCase().replace(/\s+/g, "-"),
      score: t.detectionCount,
      color: t.detectionCount > 0 ? "#10b981" : "#27272a",
      comment: `Covered by SUMI-TAH detections (${t.detectionCount} active queries/hunts)`,
      enabled: true,
    })),
  };

  return new NextResponse(JSON.stringify(navigatorLayer, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="sumitah-attack-navigator-v4.3.json"',
    },
  });
}