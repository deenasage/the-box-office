// SPEC: routing-rules.md
// SPEC: design-improvements.md
"use client";

import { useState } from "react";
import { Team } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { RoutingRuleDialog, RoutingRuleRow } from "./RoutingRuleDialog";
import { TEAM_LABELS } from "@/lib/constants";

export interface RuleStatRow {
  ruleId: string;
  matchCount: number;
  lastMatchedAt: string | null;
}

interface RoutingRulesTableProps {
  initialRules: RoutingRuleRow[];
  /** Per-rule match stats from GET /api/admin/routing-rules/stats */
  initialStats?: RuleStatRow[];
}

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const TEAM_BADGE: Record<Team, string> = {
  CONTENT:    "bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20",
  DESIGN:     "bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20",
  SEO:        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
  WEM:        "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
  PAID_MEDIA: "bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-500/20",
  ANALYTICS:  "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/20",
};

function MatchCountCell({ stat }: { stat: RuleStatRow | undefined }) {
  if (!stat) {
    return <td className="px-4 py-3 text-muted-foreground text-xs">—</td>;
  }

  const isStale = stat.matchCount === 0;
  const relativeDate =
    stat.lastMatchedAt != null
      ? formatDistanceToNow(new Date(stat.lastMatchedAt), { addSuffix: true })
      : null;

  return (
    <td className="px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span
          className={`text-sm font-medium ${
            isStale ? "text-red-400" : "text-foreground"
          }`}
          title={
            isStale
              ? "No matches in the last 90 days — this rule may be stale"
              : undefined
          }
        >
          {stat.matchCount}
        </span>
        {relativeDate && (
          <span className="text-xs text-muted-foreground">{relativeDate}</span>
        )}
        {isStale && (
          <span className="text-xs text-red-400">No recent matches</span>
        )}
      </div>
    </td>
  );
}

export function RoutingRulesTable({
  initialRules,
  initialStats = [],
}: RoutingRulesTableProps) {
  const [rules, setRules] = useState<RoutingRuleRow[]>(initialRules);
  const [stats] = useState<RuleStatRow[]>(initialStats);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<RoutingRuleRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const statsMap = new Map<string, RuleStatRow>(stats.map((s) => [s.ruleId, s]));
  const hasStats = initialStats.length > 0;

  function openCreate() {
    setEditTarget(null);
    setDialogMode("create");
  }

  function openEdit(rule: RoutingRuleRow) {
    setEditTarget(rule);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditTarget(null);
  }

  function handleSaved(rule: RoutingRuleRow) {
    setRules((prev) => {
      const exists = prev.some((r) => r.id === rule.id);
      return exists
        ? prev.map((r) => (r.id === rule.id ? rule : r))
        : [...prev, rule].sort((a, b) => a.priority - b.priority);
    });
    closeDialog();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this routing rule?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/routing-rules/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleActive(rule: RoutingRuleRow) {
    const next = !rule.isActive;
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, isActive: next } : r))
    );
    try {
      const res = await fetch(`/api/routing-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        // Revert
        setRules((prev) =>
          prev.map((r) =>
            r.id === rule.id ? { ...r, isActive: rule.isActive } : r
          )
        );
      }
    } catch {
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, isActive: rule.isActive } : r
        )
      );
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Rule
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">
                Priority
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Team
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Keywords
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">
                Active
              </th>
              {hasStats && (
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground w-32"
                  title="Number of tickets matched by this rule in the last 90 days"
                >
                  Matches (90d)
                </th>
              )}
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td
                  colSpan={hasStats ? 6 : 5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No routing rules yet. Click "New Rule" to add one.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {rule.priority}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TEAM_BADGE[rule.team]}`}
                    >
                      {TEAM_LABELS[rule.team]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {rule.keywords.slice(0, 5).join(", ")}
                    {rule.keywords.length > 5 && (
                      <span className="ml-1 text-xs">
                        +{rule.keywords.length - 5} more
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      role="switch"
                      aria-checked={rule.isActive}
                      onClick={() => handleToggleActive(rule)}
                      className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                        rule.isActive ? "bg-primary" : "bg-input"
                      }`}
                    >
                      <span className="sr-only">
                        {rule.isActive ? "Deactivate" : "Activate"} rule
                      </span>
                      <span
                        className={`pointer-events-none mt-0.5 ml-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          rule.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  {hasStats && (
                    <MatchCountCell stat={statsMap.get(rule.id)} />
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(rule)}
                        aria-label="Edit rule"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        disabled={deletingId === rule.id}
                        aria-label="Delete rule"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {dialogMode && (
        <RoutingRuleDialog
          mode={dialogMode}
          rule={editTarget ?? undefined}
          onSaved={handleSaved}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
