// SPEC: tickets.md
// GET /api/admin/routing-rules/stats
// Auth: ADMIN role required
// Response: { data: RuleMatchStat[] }
//
// Loads all active routing rules + all tickets from the last 90 days,
// runs each ticket through the same keyword-matching logic used by detectTeam(),
// and returns per-rule match counts and the most recently matched ticket date.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole } from "@prisma/client";
import { detectTeam } from "@/lib/routing";

export const dynamic = "force-dynamic";

interface RuleMatchStat {
  ruleId: string;
  matchCount: number;
  lastMatchedAt: string | null;
}

// GET /api/admin/routing-rules/stats
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Load all active routing rules ordered by priority (descending) — mirrors
    // the order used inside detectTeam() so we can track which rule fires first.
    const rules = await db.routingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: "desc" },
    });

    if (rules.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Tickets from the last 90 days only — keeps the computation bounded.
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const tickets = await db.ticket.findMany({
      where: {
        createdAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        title: true,
        description: true,
        formData: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Per-rule accumulators: matchCount and the most recent ticket createdAt
    const matchCounts = new Map<string, number>();
    const lastMatchedAt = new Map<string, Date>();

    for (const rule of rules) {
      matchCounts.set(rule.id, 0);
    }

    for (const ticket of tickets) {
      // Parse formData safely — it's stored as a JSON string
      let formData: Record<string, unknown> = {};
      try {
        formData = JSON.parse(ticket.formData) as Record<string, unknown>;
      } catch {
        // Malformed formData — treat as empty, don't skip the ticket
      }

      // Replicate the haystack construction from routing.ts exactly
      let haystack = `${ticket.title} ${ticket.description ?? ""}`.toLowerCase();
      const formValues = Object.values(formData)
        .filter((v) => v !== null && v !== undefined)
        .map((v) => (Array.isArray(v) ? (v as unknown[]).join(" ") : String(v)))
        .join(" ");
      if (formValues) haystack += " " + formValues.toLowerCase();

      // Walk rules in priority order — first match wins, same as detectTeam()
      for (const rule of rules) {
        let keywords: string[] = [];
        try {
          keywords = JSON.parse(rule.keywords) as string[];
        } catch {
          continue;
        }

        const matched = keywords.some((kw) =>
          haystack.includes(kw.toLowerCase())
        );

        if (matched) {
          matchCounts.set(rule.id, (matchCounts.get(rule.id) ?? 0) + 1);

          const prev = lastMatchedAt.get(rule.id);
          if (!prev || ticket.createdAt > prev) {
            lastMatchedAt.set(rule.id, ticket.createdAt);
          }

          // Stop at the first matching rule — this mirrors detectTeam() behaviour
          break;
        }
      }
    }

    const stats: RuleMatchStat[] = rules.map((rule) => ({
      ruleId: rule.id,
      matchCount: matchCounts.get(rule.id) ?? 0,
      lastMatchedAt: lastMatchedAt.get(rule.id)?.toISOString() ?? null,
    }));

    return NextResponse.json({ data: stats });
  } catch (err) {
    console.error("[routing-rules/stats]", err);
    return NextResponse.json(
      { error: "Failed to compute routing rule stats" },
      { status: 500 }
    );
  }
}
