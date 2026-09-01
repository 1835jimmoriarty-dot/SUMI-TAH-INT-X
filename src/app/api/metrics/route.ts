export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

const startTime = Date.now();

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  // Anonymous callers only get a minimal public health probe — no telemetry
  if (!session) {
    return NextResponse.json({
      status: 'HEALTHY',
      platform: 'SUMI-TAH',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }

  // Authenticated analysts get full operational telemetry
  try {
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);

    const [huntsCount, casesCount, iocsCount, auditCount] = await Promise.all([
      prisma.hunt.count({ where: { orgId: session.orgId } }).catch(() => 0),
      prisma.case.count({ where: { orgId: session.orgId } }).catch(() => 0),
      prisma.iOC.count().catch(() => 0),
      prisma.auditLog.count({ where: { orgId: session.orgId } }).catch(() => 0),
    ]);

    return NextResponse.json({
      status: 'HEALTHY',
      platform: 'SUMI-TAH',
      version: '1.0.0',
      uptimeSeconds: uptimeSec,
      memoryUsage: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      },
      telemetryStats: {
        totalHunts: huntsCount,
        totalCases: casesCount,
        totalIOCs: iocsCount,
        totalAuditEvents: auditCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'ERROR', error: err.message },
      { status: 500 }
    );
  }
}