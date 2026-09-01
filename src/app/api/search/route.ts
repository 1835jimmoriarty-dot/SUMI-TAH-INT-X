export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const contains = q; // Prisma mode: default insensitive on SQLite

  const [iocs, hunts, cases, hypotheses, actors, techniques] = await Promise.all([
    prisma.iOC.findMany({
      where: {
        OR: [
          { value: { contains } },
          { defangedVal: { contains } },
          { type: { contains } },
        ],
      },
      take: 5,
    }),
    prisma.hunt.findMany({
      where: {
        orgId: session.orgId,
        OR: [{ title: { contains } }, { description: { contains } }],
      },
      take: 5,
    }),
    prisma.case.findMany({
      where: {
        orgId: session.orgId,
        OR: [{ title: { contains } }, { description: { contains } }],
      },
      take: 5,
    }),
    prisma.hypothesis.findMany({
      where: {
        orgId: session.orgId,
        OR: [{ title: { contains } }, { rationale: { contains } }],
      },
      take: 5,
    }),
    prisma.threatActor.findMany({
      where: {
        OR: [{ name: { contains } }, { description: { contains } }],
      },
      take: 5,
    }),
    prisma.mitreAttack.findMany({
      where: {
        OR: [
          { techniqueId: { contains } },
          { name: { contains } },
          { tactic: { contains } },
        ],
      },
      take: 5,
    }),
  ]);

  const results = [
    ...iocs.map((i) => ({
      category: "IOC",
      title: i.defangedVal,
      subtitle: `Type: ${i.type} • Reputation: ${i.reputation}`,
      link: `/iocs?search=${encodeURIComponent(i.value)}`,
    })),
    ...hunts.map((h) => ({
      category: "HUNT",
      title: h.title,
      subtitle: `Stage: ${h.stage} • Verdict: ${h.verdict || "In Progress"}`,
      link: `/hunts`,
    })),
    ...cases.map((c) => ({
      category: "CASE",
      title: c.title,
      subtitle: `Severity: ${c.severity} • Priority: ${c.priority}`,
      link: `/cases`,
    })),
    ...hypotheses.map((hyp) => ({
      category: "HYPOTHESIS",
      title: hyp.title,
      subtitle: `Confidence: ${hyp.confidence}`,
      link: `/hypotheses`,
    })),
    ...actors.map((a) => ({
      category: "ACTOR",
      title: a.name,
      subtitle: `Country: ${a.originCountry || "Unknown"} • Motivation: ${a.motivation || "Espionage"}`,
      link: `/actors`,
    })),
    ...techniques.map((t) => ({
      category: "ATT&CK",
      title: `${t.techniqueId}: ${t.name}`,
      subtitle: `Tactic: ${t.tactic}`,
      link: `/attack`,
    })),
  ];

  return NextResponse.json({ results });
}