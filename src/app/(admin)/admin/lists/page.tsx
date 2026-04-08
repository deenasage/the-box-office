// SPEC: labels.md
import { db } from "@/lib/db";
import { LabelsManager } from "@/components/labels/LabelsManager";
import { SkillsetsManager } from "@/components/skillsets/SkillsetsManager";
import { ListValueSection } from "@/components/admin/ListValueSection";
import { ListsNav } from "@/components/admin/ListsNav";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_BADGE_STYLES, PRIORITY_LABELS, PRIORITY_BADGE_STYLES } from "@/lib/constants";

export const metadata = { title: "Lists | Admin" };

const DEFAULT_PRIORITIES = [
  { value: "Urgent",  sortOrder: 0 },
  { value: "High",    sortOrder: 1 },
  { value: "Medium",  sortOrder: 2 },
  { value: "Low",     sortOrder: 3 },
];

const DEFAULT_TEAMS = [
  { value: "Content", sortOrder: 0 },
  { value: "Design", sortOrder: 1 },
  { value: "SEO", sortOrder: 2 },
  { value: "WEM", sortOrder: 3 },
  { value: "Paid Media", sortOrder: 4 },
  { value: "Analytics", sortOrder: 5 },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function AdminListsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? "teams";

  // Seed default teams into list_values if none exist yet (cheap after first run)
  try {
    const teamCount = await db.listValue.count({ where: { listKey: "team" } });
    if (teamCount === 0) {
      await db.$transaction(async (tx) => {
        for (const t of DEFAULT_TEAMS) {
          await tx.listValue.upsert({
            where: { listKey_value: { listKey: "team", value: t.value } },
            create: { listKey: "team", value: t.value, sortOrder: t.sortOrder },
            update: {},
          });
        }
      });
    }
  } catch { /* non-fatal — section will still render via client fetch */ }

  // Seed default priorities into list_values if none exist yet
  try {
    const priorityCount = await db.listValue.count({ where: { listKey: "priority" } });
    if (priorityCount === 0) {
      await db.$transaction(async (tx) => {
        for (const p of DEFAULT_PRIORITIES) {
          await tx.listValue.upsert({
            where: { listKey_value: { listKey: "priority", value: p.value } },
            create: { listKey: "priority", value: p.value, sortOrder: p.sortOrder },
            update: {},
          });
        }
      });
    }
  } catch { /* non-fatal */ }

  // Fetch only what's needed for the active tab
  let labels: Awaited<ReturnType<typeof db.label.findMany>> | null = null;
  let skillsets: { id: string; name: string; team: string | null; color: string; isActive: boolean }[] | null = null;

  if (activeTab === "labels") {
    try {
      labels = await db.label.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { tickets: true } } },
      });
    } catch { /* graceful — null means error state */ }
  }

  if (activeTab === "skillsets") {
    try {
      skillsets = await db.skillset.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, team: true, color: true, isActive: true },
      });
    } catch { /* graceful — null means error state */ }
  }

  const ticketStatuses = ["BACKLOG", "TODO", "READY", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE"] as const;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage dropdown options used across the app.
        </p>
      </div>

      {/* Tab navigation */}
      <ListsNav activeTab={activeTab} />

      {/* Active section */}
      {activeTab === "teams" && (
        <section aria-labelledby="section-teams">
          <h2 id="section-teams" className="text-base font-semibold text-foreground mb-3">Teams</h2>
          <ListValueSection
            title="Teams"
            listKey="team"
            singularLabel="Team"
            description="Team names used across tickets, capacity, and routing."
          />
        </section>
      )}

      {activeTab === "skillsets" && (
        <section aria-labelledby="section-skillsets">
          <h2 id="section-skillsets" className="text-base font-semibold text-foreground mb-3">Skillsets</h2>
          {skillsets === null ? (
            <p className="text-sm text-destructive">
              Failed to load skillsets. Please refresh the page.
            </p>
          ) : (
            <SkillsetsManager initialSkillsets={skillsets} />
          )}
        </section>
      )}

      {activeTab === "labels" && (
        <section aria-labelledby="section-labels">
          <h2 id="section-labels" className="text-base font-semibold text-foreground mb-3">Labels</h2>
          {labels === null ? (
            <p className="text-sm text-destructive">
              Failed to load labels. Please refresh the page.
            </p>
          ) : (
            <LabelsManager initialLabels={labels} />
          )}
        </section>
      )}

      {activeTab === "tiers" && (
        <section aria-labelledby="section-tiers">
          <h2 id="section-tiers" className="text-base font-semibold text-foreground mb-3">Tiers</h2>
          <ListValueSection
            title="Tiers"
            listKey="tier"
            singularLabel="Tier"
            description="Tier options available when creating or editing tickets."
          />
        </section>
      )}

      {activeTab === "categories" && (
        <section aria-labelledby="section-categories">
          <h2 id="section-categories" className="text-base font-semibold text-foreground mb-3">Categories</h2>
          <ListValueSection
            title="Categories"
            listKey="category"
            singularLabel="Category"
            description="Category options available when creating or editing tickets."
          />
        </section>
      )}

      {activeTab === "regions" && (
        <section aria-labelledby="section-regions">
          <h2 id="section-regions" className="text-base font-semibold text-foreground mb-3">Regions</h2>
          <ListValueSection
            title="Regions"
            listKey="region"
            singularLabel="Region"
            description="Region options available when creating or editing tickets."
          />
        </section>
      )}

      {activeTab === "statuses" && (
        <section aria-labelledby="section-statuses">
          <h2 id="section-statuses" className="text-base font-semibold text-foreground mb-3">Statuses</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Statuses are system-defined.
          </p>
          <div className="flex flex-wrap gap-2">
            {ticketStatuses.map((status) => (
              <Badge
                key={status}
                variant="outline"
                className={cn("text-xs font-medium", STATUS_BADGE_STYLES[status])}
              >
                {STATUS_LABELS[status]}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {activeTab === "priorities" && (
        <section aria-labelledby="section-priorities">
          <h2 id="section-priorities" className="text-base font-semibold text-foreground mb-3">Priorities</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Priority levels are system-defined. Contact your developer to add or rename levels.
          </p>
          <div className="flex flex-wrap gap-2">
            {([4, 3, 2, 1] as const).map((level) => (
              <Badge
                key={level}
                variant="outline"
                className={cn("text-xs font-medium", PRIORITY_BADGE_STYLES[level])}
              >
                {PRIORITY_LABELS[level]}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
