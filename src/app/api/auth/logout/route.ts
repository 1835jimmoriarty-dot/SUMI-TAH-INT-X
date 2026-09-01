export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getSessionFromRequest, AUTH_COOKIE_NAME } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (session) {
    await createAuditLog({
      action: "AUTH_LOGOUT",
      resource: "User",
      userId: session.userId,
      orgId: session.orgId,
      status: "SUCCESS",
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}