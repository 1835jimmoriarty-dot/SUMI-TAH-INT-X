export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { getAIProvider } from "@/lib/ai";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const provider = getAIProvider();

  const response = await provider.analyze({
    capability: body.capability || "HUNT_SUMMARY",
    prompt: body.prompt || "Analyze threat hunting telemetry",
    contextData: body.contextData,
  });

  await prisma.aIActivity.create({
    data: {
      capability: response.capability,
      prompt: body.prompt || "",
      response: JSON.stringify(response),
      isAdvisory: true,
      userId: session.userId,
    },
  });

  await createAuditLog({
    action: "AI_ADVISORY_CONSULTED",
    resource: "AIActivity",
    userId: session.userId,
    details: { capability: response.capability },
  });

  return NextResponse.json(response);
}