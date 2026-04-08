# Feature: Priority Labels Overhaul

## Overview

Replace the current numeric priority system (0=none, 1=Low, 2=Medium, 3=High) with a four-level named system: **Urgent, High, Medium, Low**. The coloured dot indicator is removed everywhere it appears. Priority is displayed as a plain text badge only. The `Ticket.priority` field stays as an `Int` but its semantic mapping shifts: 0=none/unset, 1=Low, 2=Medium, 3=High, 4=Urgent. Existing data (max value 3) is automatically valid under the new mapping — no data migration is needed. The Admin Lists page gains a new read-only "Priorities" tab displaying the four named levels.

**Why keep `Int` instead of moving to an enum?** SQLite does not support `ALTER COLUMN` for enum changes. Converting `priority` to a Prisma enum on SQLite requires a full table rebuild migration that risks data loss and breaks the libsql adapter. The `Int` approach is safe, already sorted correctly by numeric value, and all display logic is centralised in constants.

---

## Data Model

No schema change is required for existing tickets. One new value (4=Urgent) is added to the semantic range. The only schema change is raising the Zod validation ceiling in API routes from `max(3)` to `max(4)`.

```prisma
// Ticket.priority field — unchanged in schema.prisma
priority Int @default(0) /// 0=none 1=Low 2=Medium 3=High 4=Urgent
```

The `ListValue` model (already in schema) is used to persist the display-only Priorities list for the Admin tab. No new model is needed.

```prisma
// Seeded rows in ListValue — listKey = "priority"
// { listKey: "priority", value: "Urgent",  sortOrder: 0 }
// { listKey: "priority", value: "High",    sortOrder: 1 }
// { listKey: "priority", value: "Medium",  sortOrder: 2 }
// { listKey: "priority", value: "Low",     sortOrder: 3 }
```

---

## Priority Scale — Definitive Mapping

| Int value | Label   | Badge style (Tailwind)                                                                 |
|-----------|---------|----------------------------------------------------------------------------------------|
| 0         | —       | No badge rendered                                                                      |
| 1         | Low     | `bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20` |
| 2         | Medium  | `bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-1 ring-inset ring-yellow-500/20` |
| 3         | High    | `bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20` |
| 4         | Urgent  | `bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20`       |

The dot element (`<span className="h-2 w-2 rounded-full ...">`) is removed from every render site. No coloured dots anywhere.

---

## Constants Changes (`src/lib/constants.ts`)

Replace the following exports:

```typescript
// REMOVE — dot colours are no longer used for Ticket.priority
export const PRIORITY_DOT_COLORS_NUMERIC: Record<number, string> = { ... }

// REMOVE — string-keyed dot colours used in ProposalCard (replaced below)
export const PRIORITY_DOT_COLORS: Record<string, string> = { ... }

// REPLACE — extend to include Urgent
export const PRIORITY_LABELS: readonly string[] = ["—", "Low", "Medium", "High", "Urgent"];

// ADD — badge classes keyed by numeric priority (0 renders nothing)
export const PRIORITY_BADGE_STYLES: Record<number, string> = {
  1: "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  2: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 ring-1 ring-inset ring-yellow-500/20",
  3: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
  4: "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
};
```

---

## User Stories

- As a team member, I can see a ticket's priority as a plain text badge (e.g. "Urgent") so that priority is legible without relying on colour interpretation.
- As a team member, I can set a ticket's priority to Urgent when it is the highest level needed.
- As a team lead, I can view the Admin Lists → Priorities tab to see the four priority levels and understand the ordering.
- As a developer submitting intake forms, tickets created via intake receive `priority: 0` (unset) and can be set later.

---

## Acceptance Criteria

- [ ] `PRIORITY_LABELS` in `src/lib/constants.ts` is `["—", "Low", "Medium", "High", "Urgent"]` (index 0–4)
- [ ] `PRIORITY_DOT_COLORS` and `PRIORITY_DOT_COLORS_NUMERIC` are removed from `src/lib/constants.ts`
- [ ] `PRIORITY_BADGE_STYLES` is exported from `src/lib/constants.ts` with styles for indices 1–4
- [ ] No `<span className="h-2 w-2 rounded-full ...">` priority dot exists in any component
- [ ] Every priority render site shows a text-only badge using `PRIORITY_BADGE_STYLES`
- [ ] Priority 0 renders nothing (no badge, no dash, no dot)
- [ ] Kanban `PRIORITY_COLORS` array in `src/components/kanban/types.ts` is removed; affected render sites updated
- [ ] `PRIORITY_GROUP_LABELS` in `src/components/kanban/types.ts` updated to include `4: "Urgent"`
- [ ] All inline `const PRIORITY_LABELS` local to individual components are removed — all consumers import from `src/lib/constants.ts`
- [ ] `KanbanTicketPanel` priority dropdown options show Low / Medium / High / Urgent (values 1–4) plus a "No priority" option (value 0)
- [ ] API route `src/app/api/tickets/route.ts` Zod schema updated: `z.number().int().min(0).max(4)`
- [ ] API route `src/app/api/tickets/[id]/route.ts` Zod schema updated: `z.number().int().min(0).max(4)`
- [ ] `priorityLabel()` functions in export and import routes updated to include `4 → "Urgent"`
- [ ] `priorityToInt()` in `confirm-split` route maps `"URGENT"` to `4` (not `3`)
- [ ] `src/app/(admin)/admin/lists/page.tsx` includes a "priorities" tab case that renders the four priority badges read-only
- [ ] `src/components/admin/ListsNav.tsx` includes `{ key: "priorities", label: "Priorities" }` in `TABS`
- [ ] Admin Lists → Priorities tab seeds four `ListValue` rows (`listKey: "priority"`) on first load, same pattern as Teams tab
- [ ] `TicketTableRow` amber left-border rule updated: triggers at `priority >= 4` (Urgent), not `>= 3`
- [ ] `ProposalCard` priority dot replaced with text badge; mapping updated to include Urgent (4)
- [ ] TypeScript compiles with 0 errors (`npx tsc --noEmit`)

---

## Affected Files

### Constants and types (touch first — all others depend on these)

| File | What changes |
|---|---|
| `src/lib/constants.ts` | Remove `PRIORITY_DOT_COLORS`, `PRIORITY_DOT_COLORS_NUMERIC`. Update `PRIORITY_LABELS` to 5-element array. Add `PRIORITY_BADGE_STYLES`. |
| `src/components/kanban/types.ts` | Remove `PRIORITY_COLORS` array. Add `4: "Urgent"` to `PRIORITY_GROUP_LABELS`. |
| `src/types/index.ts` | No change needed — `priority: number` type is still correct. |

### UI components — priority dot removal + badge replacement

| File | What changes |
|---|---|
| `src/components/kanban/KanbanCard.tsx` | Remove local `PRIORITY_LABELS`. Import `PRIORITY_LABELS`, `PRIORITY_BADGE_STYLES` from constants. Remove dot `<span>`. Replace with text badge. Remove import of `PRIORITY_COLORS` from `./types`. |
| `src/components/kanban/KanbanTicketPanel.tsx` | Remove local `PRIORITY_LABELS`. Import from constants. Update dropdown options to include Urgent (value 4). |
| `src/components/kanban/KanbanBoard.tsx` | No change needed — uses `PRIORITY_GROUP_LABELS` from `./types` (already updated above). |
| `src/components/tickets/TicketCard.tsx` | Remove local `PRIORITY_DOT` record. Import `PRIORITY_BADGE_STYLES` from constants. Remove dot `<span>`. Replace with text badge. |
| `src/components/tickets/TicketTableRow.tsx` | Remove local `PRIORITY_LABELS`. Import from constants. Remove dot `<span>`. Replace with text badge. Update amber border rule from `>= 3` to `>= 4`. |
| `src/components/my-work/MyWorkClient.tsx` | Remove import of `PRIORITY_DOT_COLORS_NUMERIC`. Import `PRIORITY_BADGE_STYLES`. Two render sites: remove dot, add text badge. |
| `src/components/sprints/ProposalCard.tsx` | Remove import of `PRIORITY_DOT_COLORS`. Remove dot `<span>`. Replace `priorityKey` ternary chain with numeric lookup via `PRIORITY_LABELS` + `PRIORITY_BADGE_STYLES`. |
| `src/components/briefs/TeamSplitReviewModal.tsx` | Remove local `PRIORITY_COLORS`. Add Urgent to `PRIORITY_OPTIONS`. Replace dot styling with badge styling using new constants. |

### Ticket detail page

| File | What changes |
|---|---|
| `src/app/(app)/tickets/[id]/page.tsx` | Remove local `PRIORITY_COLORS` array. Remove triangle `▲` prefix and colour class. Replace with text badge using `PRIORITY_BADGE_STYLES`. |

### API routes — validation and label functions

| File | What changes |
|---|---|
| `src/app/api/tickets/route.ts` | `z.number().int().min(0).max(3)` → `.max(4)` |
| `src/app/api/tickets/[id]/route.ts` | `.max(3)` → `.max(4)`. Update local `priorityLabel()` function to add `case 4: return "Urgent"`. |
| `src/app/api/export/tickets/route.ts` | Update local `priorityLabel()`: `if (p === 4) return "Urgent"`. |
| `src/app/api/import/jira/route.ts` | Update local `priorityLabel()`. Update `mapPriority()` to map "Highest" / "Critical" to `4`. |
| `src/app/api/briefs/[id]/confirm-split/route.ts` | Update `priorityToInt()`: `case "URGENT": return 4`. |
| `src/app/api/briefs/[id]/suggest-split/route.ts` | No functional change — prompt already uses "URGENT" string. AI output validation already accepts it. |
| `src/app/api/briefs/[id]/generate-tickets\route.ts` | No change — hardcodes `priority: 0` (correct default). |
| `src/app/api/intake/route.ts` | No change — hardcodes `priority: 0` (correct default). |

### Admin Lists

| File | What changes |
|---|---|
| `src/components/admin/ListsNav.tsx` | Add `{ key: "priorities", label: "Priorities" }` to `TABS` array. |
| `src/app/(admin)/admin/lists/page.tsx` | Add seed block for `listKey: "priority"` (4 rows). Add `activeTab === "priorities"` case rendering read-only badge list. |

### No-change files (priority field referenced but no display or validation logic affected)

| File | Why unchanged |
|---|---|
| `src/lib/ai/context-tickets.ts` | Uses `priority` only for `orderBy` sort direction. |
| `src/app/(app)/tickets/list/page.tsx` | Passes `priority` to `TicketListTable` — display handled inside component. |
| `src/app/(app)/my-work/page.tsx` | Passes `priority` to `MyWorkClient` — display handled inside component. |
| `src/app/(app)/sprints/[id]/page.tsx` | Passes `priority` to sprint ticket list — display handled in child components. |
| `src/app/api/sprints/[id]/route.ts` | Selects `priority: true` for JSON response. No label logic. |
| `src/app/api/sprints/[id]/carryover/route.ts` | Selects `priority: true`. No label logic. |
| `src/app/api/tickets/auto-assign/preview/route.ts` | Passes `priority` as numeric in response payload. |
| `src/app/api/admin/routing-rules/stats/route.ts` | Uses `priority` for rule ordering (routing rule priority, not ticket priority). |
| `src/components/tickets/ActivityFeedItem.tsx` | Maps field name `"priority"` to label string `"Priority"`. No value display. |
| `src/components/tickets/SortHeader.tsx` | References `"priority"` as a sort key string. No display change. |
| `src/components/tickets/QuickCreateTicket.tsx` | Hardcodes `priority: 0` as default. Correct. |
| `src/components/sprints/RefinementTab.tsx` | `priority: number` in local type only — display delegated to child. Verify no inline dot render. |
| `src/components/sprints/SprintPlanningModal.tsx` | Uses `priority` for sort only. |
| `src/components/sprints/auto-assign-types.ts` | Type definition only. |
| `src/lib/routing.ts` | `priority` refers to `RoutingRule.priority` (rule ordering weight), not ticket priority. |
| `src/components/routing/RoutingRuleDialog.tsx` | `priority` is routing rule weight, not ticket priority. |
| `src/components/routing/RoutingRulesTable.tsx` | Same — routing rule weight. |
| `src/app/(admin)/admin/import/page.tsx` | Displays raw string value from CSV import preview. No priority label mapping here. |
| `src/app/(admin)/admin/routing-rules/page.tsx` | Routing rule priority, not ticket priority. |
| `src/types/project-document.ts` | `HypercarePriority` is a separate type unrelated to `Ticket.priority`. |
| `src/components/project-document/tabs/HypercareTab.tsx` | Uses `HypercarePriority` (LOW/MEDIUM/HIGH/CRITICAL strings). Unrelated. |
| `src/app/api/portfolio/[epicId]/document/route.ts` | Same — portfolio document priority, not ticket priority. |
| `src/app/api/portfolio/[epicId]/document/download/route.ts` | Same. |

---

## Build Order

1. **Backend Engineer**: Update Zod validation in `src/app/api/tickets/route.ts` and `src/app/api/tickets/[id]/route.ts` (`.max(3)` → `.max(4)`). Update all `priorityLabel()` functions in export, import, and ticket routes. Update `priorityToInt()` in confirm-split route.
2. **Frontend Engineer**: Update `src/lib/constants.ts` — this is the shared foundation all component changes depend on. Remove dot colour exports. Add `PRIORITY_BADGE_STYLES`. Extend `PRIORITY_LABELS`.
3. **Frontend Engineer**: Update `src/components/kanban/types.ts` — remove `PRIORITY_COLORS`, extend `PRIORITY_GROUP_LABELS`.
4. **Frontend Engineer**: Update all UI components in order: `KanbanCard`, `KanbanTicketPanel`, `TicketCard`, `TicketTableRow`, `MyWorkClient`, `ProposalCard`, `TeamSplitReviewModal`, `src/app/(app)/tickets/[id]/page.tsx`.
5. **Frontend Engineer**: Add "Priorities" tab to Admin Lists — update `ListsNav`, add seed + render case to `lists/page.tsx`.

---

## Admin Lists → Priorities Tab Design

The Priorities tab is **read-only**. Admins cannot reorder, rename, or delete priority levels because the `Int` values are hardcoded in the database schema and throughout the business logic. Allowing renames would silently break the mapping without a code change.

The tab renders four badge pills in descending order of severity:

```
[Urgent]  [High]  [Medium]  [Low]
```

Each pill uses the same `PRIORITY_BADGE_STYLES` class as the live UI. Below the pills, a note reads: "Priority levels are system-defined. Contact your developer to add or rename levels."

This matches the existing "Statuses" tab pattern — system-defined values displayed informatively, not editably.

---

## Edge Cases

- **Existing tickets with `priority: 3`** — these were "High" before and remain "High" (value 3 = High in new scale). No data migration needed.
- **Tickets imported from Jira with "Highest" or "Critical" priority** — `mapPriority()` in the Jira import route must map these to `4` (Urgent), not silently fall to `0`.
- **AI-generated tickets via `suggest-split`** — the AI prompt already accepts "URGENT" as a valid priority string. `priorityToInt()` must map it to `4` instead of the current `3`. Existing tickets generated before this change will have `priority: 3` (High) rather than `4` — this is acceptable; they were never truly "Urgent" in the old scale either.
- **`TicketTableRow` amber border** — currently triggers at `priority >= 3`. After this change, the visual urgency indicator should trigger at `priority >= 4` (Urgent only). High-priority tickets no longer get the amber border. This is a deliberate UX decision: the border should signal true urgency, not just high priority.
- **KanbanBoard group-by priority** — the `PRIORITY_GROUP_LABELS` lookup must include `4: "Urgent"`. Tickets with `priority: 4` currently do not exist (max is 3), so no existing grouped view will break, but the key must be present for newly-set Urgent tickets to render their group header correctly.
- **`priority: 0` render** — every render site currently gates on `priority > 0` before rendering anything. This gate must remain. Priority 0 = unset = render nothing.
- **ProposalCard** — currently maps numeric priority to string keys (`"HIGH"`, `"MEDIUM"`, `"LOW"`) to look up `PRIORITY_DOT_COLORS`. After this change, the ternary chain is replaced with a direct numeric lookup via `PRIORITY_LABELS[row.priority]` and `PRIORITY_BADGE_STYLES[row.priority]`.

---

## Out of Scope (Phase 1)

- Allowing admins to add custom priority levels (requires schema change and a full priority-as-enum or JSON-config refactor — Phase 2 consideration)
- Renaming priority labels per-workspace
- Priority-based SLA or notification rules
- Filtering tickets by multiple priority levels simultaneously in the list view (existing single-value filter is sufficient)
- Any change to `HypercarePriority` (LOW/MEDIUM/HIGH/CRITICAL) in project documents — that is a separate type with no connection to `Ticket.priority`

---

## Architect's Notes

**On not migrating to a Prisma enum:** The request involves adding one value (Urgent) and renaming the scale. The `Int` field handles this with zero migration risk. A future move to an enum (e.g. `Priority` enum with `LOW | MEDIUM | HIGH | URGENT | NONE`) is feasible only after confirming the libsql adapter supports `ALTER TABLE` for enum columns, or by using a shadow-table migration. Do not attempt this without a tested migration script.

**On the amber border threshold:** Moving the border from `>= 3` (High) to `>= 4` (Urgent) is a product decision baked into this spec. If the product owner wants High tickets to continue getting the amber border, update the criterion to `>= 3` and note it explicitly before the Frontend Engineer touches `TicketTableRow`.

**On `TeamSplitReviewModal` PRIORITY_COLORS:** This component has its own local `PRIORITY_COLORS` record keyed by string ("LOW", "MEDIUM", etc.) that applies badge styles. It already uses badge-style classes (not dot colours), so the change here is lighter — remove the local record, import from constants, and add Urgent to `PRIORITY_OPTIONS`. The component is already halfway to the target pattern.
