import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { calculateDetectionCoverage } from "@/lib/coverage-engine";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.COVERAGE_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const allTechniques = await prisma.mitreAttack.findMany({
    select: { techniqueId: true, name: true, tactic: true, detectionCount: true },
  });

  const queries = await prisma.query.findMany({ select: { attackTags: true } });
  const hypotheses = await prisma.hypothesis.findMany({ select: { attackTags: true } });

  const activeTags: string[] = [];
  allTechniques.forEach((t) => {
    if (t.detectionCount > 0) activeTags.push(t.techniqueId);
  });

  queries.forEach((q) => {
    if (q.attackTags) {
      try {
        const parsed = JSON.parse(q.attackTags);
        if (Array.isArray(parsed)) activeTags.push(...parsed);
      } catch {}
    }
  });

  hypotheses.forEach((h) => {
    if (h.attackTags) {
      try {
        const parsed = JSON.parse(h.attackTags);
        if (Array.isArray(parsed)) activeTags.push(...parsed);
      } catch {}
    }
  });

  const report = calculateDetectionCoverage({
    allTechniques,
    activeAttackTags: Array.from(new Set(activeTags)),
  });

  return NextResponse.json(report);
}