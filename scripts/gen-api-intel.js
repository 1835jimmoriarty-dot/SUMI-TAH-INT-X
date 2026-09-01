const { write } = require('./writer');

write('src/app/api/iocs/route.ts', `
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
    type: detectedType,
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
`);

write('src/app/api/iocs/search/route.ts', `
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
`);

write('src/app/api/iocs/import/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { normalizeIOC, defangIOC, detectIOCType, calculateReputationScore } from "@/lib/ioc-engine";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.IOCS_IMPORT)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const items: Array<{ value: string; type?: string; tags?: string[] }> = body.indicators || [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "indicators array is required" }, { status: 400 });
  }

  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const norm = normalizeIOC(item.value);
      const detectedType = item.type || detectIOCType(norm);

      if (!detectedType) {
        skippedCount++;
        errors.push(\`Unrecognized type for \${item.value}\`);
        continue;
      }

      const breakdown = calculateReputationScore({
        type: detectedType,
        observationsCount: 1,
      });

      await prisma.iOC.upsert({
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
          tags: item.tags ? JSON.stringify(item.tags) : null,
        },
      });

      importedCount++;
    } catch (err: any) {
      skippedCount++;
      errors.push(err.message);
    }
  }

  await createAuditLog({
    action: "IOCS_BULK_IMPORTED",
    resource: "IOC",
    userId: session.userId,
    orgId: session.orgId,
    details: { total: items.length, importedCount, skippedCount },
  });

  return NextResponse.json({
    success: true,
    total: items.length,
    importedCount,
    skippedCount,
    errors: errors.slice(0, 5),
  });
}
`);

write('src/app/api/iocs/[id]/override/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { IOCOverrideSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.IOCS_OVERRIDE)) {
    return NextResponse.json({ error: "Unauthorized: IOC Override permission required" }, { status: 403 });
  }

  const body = await req.json();
  const validated = IOCOverrideSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: "Invalid override payload", details: validated.error.format() }, { status: 400 });
  }

  const existing = await prisma.iOC.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "IOC not found" }, { status: 404 });

  const scoreMap: Record<string, number> = {
    MALICIOUS: 95,
    HIGH_RISK: 80,
    SUSPICIOUS: 60,
    UNKNOWN: 30,
    BENIGN: 10,
    ALLOWLISTED: 0,
    CONFLICTING: 50,
  };

  const updated = await prisma.iOC.update({
    where: { id: params.id },
    data: {
      reputation: validated.data.reputation,
      score: scoreMap[validated.data.reputation] ?? 50,
      confidence: 100,
      isOverridden: true,
      overrideReason: validated.data.reason,
      overrideActor: session.name,
      scoreReasoning: JSON.stringify([
        {
          factor: "Analyst Override",
          impact: scoreMap[validated.data.reputation] ?? 50,
          description: \`Manual override by \${session.name}: \${validated.data.reason}\`,
        },
      ]),
    },
  });

  await createAuditLog({
    action: "IOC_REPUTATION_OVERRIDDEN",
    resource: "IOC",
    resourceId: params.id,
    userId: session.userId,
    orgId: session.orgId,
    details: {
      iocValue: existing.value,
      previousReputation: existing.reputation,
      newReputation: validated.data.reputation,
      reason: validated.data.reason,
    },
  });

  return NextResponse.json(updated);
}
`);

write('src/app/api/attack/route.ts', `
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
`);

write('src/app/api/attack/navigator/route.ts', `
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
      tactic: t.tactic.toLowerCase().replace(/\\s+/g, "-"),
      score: t.detectionCount,
      color: t.detectionCount > 0 ? "#10b981" : "#27272a",
      comment: \`Covered by SUMI-TAH detections (\${t.detectionCount} active queries/hunts)\`,
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
`);

write('src/app/api/defend/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.MITRE_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const defendItems = await prisma.mitreDefend.findMany({
    orderBy: { tactic: "asc" },
  });

  return NextResponse.json(defendItems);
}
`);

write('src/app/api/coverage/route.ts', `
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
`);

write('src/app/api/actors/route.ts', `
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
`);

write('src/app/api/malware/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INTEL_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const malware = await prisma.malware.findMany({
    include: {
      campaigns: { include: { threatActor: true } },
    },
  });

  return NextResponse.json(malware);
}
`);

write('src/app/api/campaigns/route.ts', `
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INTEL_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const campaigns = await prisma.campaign.findMany({
    include: {
      threatActor: true,
      malware: true,
    },
  });

  return NextResponse.json(campaigns);
}
`);

write('src/app/api/attribution/route.ts', `
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
`);