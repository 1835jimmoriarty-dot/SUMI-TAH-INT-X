export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const startTime = Date.now();

export async function GET() {
  try {
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);

    const [huntsCount, casesCount, iocsCount, auditCount] = await Promise.all([
      prisma.hunt.count().catch(() => 0),
      prisma.case.count().catch(() => 0),
      prisma.iOC.count().catch(() => 0),
      prisma.auditLog.count().catch(() => 0),
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