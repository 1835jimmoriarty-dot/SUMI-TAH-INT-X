import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // Stricter rate limiting on authentication routes (15 attempts per minute)
  if (path.startsWith('/api/auth/login')) {
    if (isRateLimited(`auth:${ip}`, 15, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many authentication attempts. Rate limit exceeded. Try again in 60 seconds.' },
        { status: 429 }
      );
    }
  }

  // General API rate limiting (180 requests per minute)
  if (path.startsWith('/api/')) {
    if (isRateLimited(`api:${ip}`, 180, 60 * 1000)) {
      return NextResponse.json(
        { error: 'API rate limit exceeded. Please throttle your requests.' },
        { status: 429 }
      );
    }
  }

  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};