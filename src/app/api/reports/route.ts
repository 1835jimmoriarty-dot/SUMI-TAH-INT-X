import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.REPORTS_READ)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    where: { orgId: session.orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session || !hasPermission(session.permissions, PERMISSIONS.REPORTS_GENERATE)) {
    return NextResponse.json({ error: "Unauthorized: Report generation permission required" }, { status: 403 });
  }

  const body = await req.json();
  const report = await prisma.report.create({
    data: {
      orgId: session.orgId,
      title: body.title || "Threat Hunting & Investigation Report",
      type: body.type || "HUNT_REPORT",
      authorName: session.name,
      summary: body.summary || "Comprehensive threat hunt findings and MITRE ATT&CK coverage analysis.",
      contentJson: JSON.stringify(body.content || {}),
      format: body.format || "PDF",
    },
  });

  await createAuditLog({
    action: "REPORT_GENERATED",
    resource: "Report",
    resourceId: report.id,
    userId: session.userId,
    orgId: session.orgId,
    details: { title: report.title, type: report.type },
  });

  return NextResponse.json(report, { status: 201 });
}