export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { LoginSchema } from "@/lib/validation";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = LoginSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Invalid input", details: validated.error.format() }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: validated.data.email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      await createAuditLog({
        action: "AUTH_LOGIN_FAILED",
        resource: "User",
        status: "FAILURE",
        details: { email: validated.data.email, reason: "Invalid credentials or inactive user" },
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const validPassword = await verifyPassword(validated.data.password, user.passwordHash);
    if (!validPassword) {
      await createAuditLog({
        action: "AUTH_LOGIN_FAILED",
        resource: "User",
        userId: user.id,
        orgId: user.orgId,
        status: "FAILURE",
        details: { email: user.email, reason: "Password mismatch" },
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.name))
      )
    );

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      roles,
      permissions,
    });

    await createAuditLog({
      action: "AUTH_LOGIN_SUCCESS",
      resource: "User",
      userId: user.id,
      orgId: user.orgId,
      status: "SUCCESS",
      details: { email: user.email, roles },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        title: user.title,
        orgId: user.orgId,
        roles,
        permissions,
      },
      token,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}