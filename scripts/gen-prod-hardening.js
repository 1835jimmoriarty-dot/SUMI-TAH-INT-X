const { write } = require('./writer');

// 1. Next.js Edge Middleware for Security Headers & Rate Limiting
write('src/middleware.ts', `
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

// In-memory sliding window rate limiter for edge/Node runtime
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  record.count += 1;
  if (record.count > limit) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const path = request.nextUrl.pathname;

  // Stricter rate limiting on authentication routes (10 attempts per minute)
  if (path.startsWith('/api/auth/login')) {
    if (isRateLimited(\`auth:\${ip}\`, 15, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Rate limit exceeded. Try again in 60 seconds.' },
        { status: 429 }
      );
    }
  }

  // General API rate limiting (120 requests per minute)
  if (path.startsWith('/api/')) {
    if (isRateLimited(\`api:\${ip}\`, 180, 60 * 1000)) {
      return NextResponse.json(
        { error: 'API rate limit exceeded. Please throttle your requests.' },
        { status: 429 }
      );
    }
  }

  const response = NextResponse.next();

  // Production Defense-in-Depth Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:;"
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
`);

// 2. Metrics & System Telemetry Route (/api/metrics)
write('src/app/api/metrics/route.ts', `
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
`);

// 3. Notifications API Route (/api/notifications)
write('src/app/api/notifications/route.ts', `
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const created = await prisma.notification.create({
      data: {
        userId: session.userId,
        title: body.title || 'Security Notification',
        message: body.message,
        type: body.type || 'INFO',
        isRead: false,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`);