import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "HEALTHY",
      app: "SUMI-TAH",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "CONNECTED",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "UNHEALTHY", database: "DISCONNECTED", error: error.message },
      { status: 503 }
    );
  }
}