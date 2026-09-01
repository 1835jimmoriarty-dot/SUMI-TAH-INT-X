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
        errors.push(`Unrecognized type for ${item.value}`);
        continue;
      }

      const breakdown = calculateReputationScore({
        type: detectedType as any,
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