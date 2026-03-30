// SPEC: design-improvements.md
// SPEC: routing-rules.md
import { db } from "@/lib/db";
import { RoutingRulesTable, RuleStatRow } from "@/components/routing/RoutingRulesTable";
import { headers } from "next/headers";

export default async function RoutingRulesPage() {
  const rules = await db.routingRule.findMany({ orderBy: { priority: "asc" } });

  // keywords is stored as a JSON string; parse it for the client
  const parsed = rules.map((r) => ({
    ...r,
    keywords: (() => {
      try {
        return JSON.parse(r.keywords) as string[];
      } catch {
        return [r.keywords];
      }
    })(),
  }));

  // Fetch match stats from the backend. Build an absolute URL using the
  // request host header so this works in all environments (local and deployed).
  let stats: RuleStatRow[] = [];
  try {
    const reqHeaders = await headers();
    const host = reqHeaders.get("host") ?? "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const res = await fetch(
      `${protocol}://${host}/api/admin/routing-rules/stats`,
      // Ensure Next.js does not cache the stats between page loads.
      { cache: "no-store" }
    );
    if (res.ok) {
      stats = (await res.json()) as RuleStatRow[];
    }
  } catch {
    // Stats are non-critical; degrade gracefully if the endpoint isn't live yet.
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Routing Rules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rules are evaluated in priority order. For intake form tickets, the first matching rule wins. For briefs, all matching rules apply — a brief can create tickets for multiple teams at once.
        </p>
      </div>
      <RoutingRulesTable initialRules={parsed} initialStats={stats} />
    </div>
  );
}
