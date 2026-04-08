# Feature: Board Column Visibility

## Overview

Admins can hide individual kanban columns per team. Hidden columns do not render on the board; tickets in hidden statuses still exist and move through the workflow but are invisible to board viewers. A collapsed indicator badge shows the count of hidden-status tickets so no work is silently lost. The existing `KanbanColumnConfig` model is extended with a `hidden` boolean. The admin page at `/admin/board-settings` exposes both the existing `wipLimit` field and the new `hidden` field in a unified per-team table. Changes take effect immediately via cache revalidation — no page reload required.

---

## Data Model

### Schema changes

One new field on `KanbanColumnConfig`. This is a non-breaking additive migration.

```prisma
model KanbanColumnConfig {
  id       String       @id @default(cuid())
  team     Team
  status   TicketStatus
  wipLimit Int?         /// null = no limit enforced
  hidden   Boolean      @default(false) /// true = column not rendered on the board

  @@unique([team, status])
}
```

### Migration notes

- Existing rows: `hidden` defaults to `false`. No backfill or manual data work required.
- The migration adds a single nullable-with-default column. All existing rows receive `false` automatically.
- There are no FK relationships on this model — migration is straightforward.

### Seed consideration

The seed file should ensure a `KanbanColumnConfig` row exists for every `[team, status]` combination before the admin page is accessed. If rows are missing, the admin page must create them on first access (upsert pattern in the API).

---

## User Stories

- As an Admin, I can navigate to `/admin/board-settings` to see a per-team table of all 7 kanban statuses so that I have one place to manage column visibility and WIP limits.
- As an Admin, I can toggle a column hidden or visible for a specific team so that teams only see the workflow stages relevant to them.
- As an Admin, I can edit the WIP limit inline for any column so that the settings surface previously managed elsewhere is consolidated here.
- As a team member viewing the kanban board, I do not see hidden columns so that the board is uncluttered and focused on active workflow stages.
- As a team member viewing the kanban board, I can see a badge indicating how many tickets are in hidden statuses so that I know work is not lost.
- As a team member, I can click the hidden-count badge to see a list of the hidden tickets so that I can act on them if needed.

---

## Acceptance Criteria

### Schema and migration

- [ ] `KanbanColumnConfig.hidden` field exists in `schema.prisma` as `Boolean @default(false)`.
- [ ] `npx prisma migrate dev` runs cleanly.
- [ ] All existing rows in `KanbanColumnConfig` receive `hidden = false` after migration.

### Admin page (`/admin/board-settings`)

- [ ] Page is accessible only to users with `role = ADMIN`. Non-admins receive a 403 redirect.
- [ ] The page shows one section per team (CONTENT, DESIGN, SEO, WEM, PAID_MEDIA, ANALYTICS) — each section is a table of all 7 statuses.
- [ ] Table columns per section: Status | WIP Limit (inline editable) | Visible (toggle) | Tickets currently in this status (count, read-only).
- [ ] "Visible" is rendered as a shadcn `Switch`. Toggle on = visible (hidden = false), toggle off = hidden (hidden = true).
- [ ] WIP Limit is an inline number input. Empty = no limit (null). Saves on blur.
- [ ] Each change (toggle or WIP limit) calls `PATCH /api/admin/board-settings/[team]/[status]` immediately.
- [ ] Success feedback: the row briefly highlights green. No full page reload.
- [ ] If a `KanbanColumnConfig` row does not exist for a given `[team, status]`, the PATCH handler upserts it (create with the supplied values, defaulting unset fields).
- [ ] The ticket count column shows how many tickets are currently in that status for that team. This is informational only.

### Board rendering

- [ ] `GET /api/kanban/column-configs` (rename/extend of existing `GET /api/kanban/wip-limits`) returns both `wipLimit` and `hidden` per `[team, status]`.
- [ ] The kanban board skips rendering any column where `hidden = true` for the active team filter.
- [ ] Skipped columns do not leave empty space — the column is entirely absent from the DOM.
- [ ] A "Hidden tickets" badge is rendered at the end of the column list if any tickets belong to hidden statuses.
  - Badge text: "N hidden" where N is the total count of tickets in all hidden statuses for the current team view.
  - Clicking the badge opens a slide-over panel listing those tickets (title, assignee, status label).
- [ ] If all columns are hidden for a team, the board shows only the "N hidden" badge and an empty state message: "All columns are hidden for this team."

### Revalidation

- [ ] After a successful `PATCH /api/admin/board-settings/[team]/[status]`, the server uses `revalidatePath` (Next.js) on the kanban board route so that the next board load reflects the change without a manual reload.
- [ ] The admin page itself revalidates its own data after each change (client state update, no full refetch).

---

## API Contract

### `GET /api/kanban/column-configs`

Returns column config for all teams, or filtered by team via query param.

**Query params**
```
?team=CONTENT   // optional — filters to a single team
```

**Response 200**
```ts
{
  data: {
    team: Team;
    status: TicketStatus;
    wipLimit: number | null;
    hidden: boolean;
  }[];
}
```

Ordered by team asc, then by the canonical status order:
`BACKLOG → TODO → READY → IN_PROGRESS → IN_REVIEW → BLOCKED → DONE`.

If no `KanbanColumnConfig` row exists for a given `[team, status]` combination, that combination is returned with defaults: `wipLimit: null, hidden: false`. The GET handler fills gaps from the full `[Team × TicketStatus]` matrix in-process — no DB row is required to exist.

Available to all authenticated users (board reads this on load).

---

### `PATCH /api/admin/board-settings/[team]/[status]`

Updates (or creates) the config for one `[team, status]` pair.

**Path params**: `team` (Team enum value), `status` (TicketStatus enum value). Both must be awaited: `const { team, status } = await params`.

**Request body**
```ts
{
  wipLimit?: number | null;  // null = remove WIP limit
  hidden?: boolean;
}
```

At least one field must be present. Returns `400` if body is empty.

**Response 200**
```ts
{
  data: {
    team: Team;
    status: TicketStatus;
    wipLimit: number | null;
    hidden: boolean;
  }
}
```

Uses `db.kanbanColumnConfig.upsert` with `@@unique([team, status])` as the where clause.
Returns `400` if `team` or `status` is not a valid enum value.
Returns `400` if `wipLimit` is a negative number.
Restricted to `ADMIN` role.

Calls `revalidatePath('/board')` (or the actual board route path) after a successful upsert.

---

### Hidden tickets endpoint

### `GET /api/kanban/hidden-tickets`

Returns tickets in hidden-status columns for a given team.

**Query params**
```
?team=CONTENT   // required
```

**Response 200**
```ts
{
  data: {
    id: string;
    title: string;
    status: TicketStatus;
    assignee: { id: string; name: string } | null;
    priority: number;
    size: TicketSize | null;
  }[];
  totalCount: number;
}
```

Logic: fetch all `KanbanColumnConfig` rows where `team = ?` and `hidden = true`. Collect the status values. Query `Ticket` where `team = ?` and `status IN [hidden statuses]`.

Returns `400` if `team` is missing or invalid.
Available to all authenticated users.

---

## Component List

| Component | File | Notes |
|---|---|---|
| `BoardSettingsPage` | `src/app/(admin)/board-settings/page.tsx` | Server component. Fetches column configs and ticket counts per team. |
| `BoardSettingsTeamSection` | `src/components/board/BoardSettingsTeamSection.tsx` | Client component. One table per team. Manages toggle and WIP limit edit state. |
| `BoardSettingsRow` | `src/components/board/BoardSettingsRow.tsx` | Single row. Switch for hidden, number input for WIP limit. Fires PATCH on change. |
| `HiddenTicketsBadge` | `src/components/board/HiddenTicketsBadge.tsx` | Badge at end of column list. Shows count. Opens `HiddenTicketsPanel` on click. |
| `HiddenTicketsPanel` | `src/components/board/HiddenTicketsPanel.tsx` | Slide-over panel. Fetches `GET /api/kanban/hidden-tickets?team=X` on open. Lists tickets. |

`HiddenTicketsBadge` receives the pre-computed count as a prop (calculated when the board data is fetched). It triggers `HiddenTicketsPanel` which lazy-fetches the full ticket list only when opened.

The existing board component must be updated to:
1. Consume `hidden` from `GET /api/kanban/column-configs`.
2. Filter out hidden columns before rendering.
3. Render `HiddenTicketsBadge` after the last visible column if any columns are hidden.

---

## Build Order

1. Database Engineer: add `hidden Boolean @default(false)` to `KanbanColumnConfig` in `schema.prisma`. Run `npx prisma migrate dev`.
2. Backend Engineer: extend `GET /api/kanban/column-configs` (or rename from `wip-limits`) to return `hidden` alongside `wipLimit`; fill gaps in the Team × Status matrix in-process.
3. Backend Engineer: implement `PATCH /api/admin/board-settings/[team]/[status]` with upsert, validation, and `revalidatePath`.
4. Backend Engineer: implement `GET /api/kanban/hidden-tickets?team=`.
5. Frontend Engineer: update the kanban board to consume `hidden` and skip rendering hidden columns.
6. Frontend Engineer: build `HiddenTicketsBadge` and `HiddenTicketsPanel`.
7. Frontend Engineer: build `BoardSettingsRow`, `BoardSettingsTeamSection`, `BoardSettingsPage`.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Admin hides `BACKLOG` for a team | New tickets that land in BACKLOG (the default status) still get created. They are not shown on the board. They appear in the hidden-tickets badge and panel. |
| Admin hides all 7 statuses for a team | Board shows only the hidden-tickets badge and an empty-state message. No column DOM nodes are rendered. |
| No `KanbanColumnConfig` row exists for a `[team, status]` pair | `GET /api/kanban/column-configs` fills the gap in-process with `hidden: false, wipLimit: null`. The PATCH handler upserts and creates the row on first write. |
| WIP limit is set to 0 | Returns `400`: "WIP limit must be a positive integer or null." Zero is not meaningful as a limit. |
| Ticket is moved to a hidden status via the ticket detail panel | Move succeeds. The ticket disappears from the board immediately. It appears in the hidden-tickets count. This is intentional — hiding a column does not prevent status transitions. |
| Two admins toggle the same column simultaneously | Last PATCH wins. No locking. The toggle is a simple boolean flip; the final state is whichever call completed last. |
| `revalidatePath` is called but the board is on a different route path | The Backend Engineer must verify the exact route path (`/board`, `/(app)/board`, etc.) and call `revalidatePath` with the correct string. If the path is dynamic (per-team), call `revalidatePath('/board', 'layout')` to revalidate all board variants. |
| Hidden-tickets panel opened on a team with 0 hidden tickets | Panel renders an empty state: "No tickets are in hidden columns." The badge should not appear in this case (badge only renders when count > 0). |
| `GET /api/kanban/hidden-tickets` called without a `team` query param | Returns `400 { error: "team is required" }`. |

---

## Out of Scope (Phase 1)

- Per-user column visibility preferences (users hiding columns for themselves only)
- Reordering columns (changing the order statuses appear on the board)
- Hiding columns based on sprint state (e.g., auto-hide BACKLOG when a sprint is active)
- Custom column labels (renaming "In Review" to "QA" per team)
- Collapsing a column to icon-width without hiding it entirely
- Bulk-moving tickets out of hidden statuses from the hidden-tickets panel (panel is read-only in Phase 1)

---

## Architect's Notes

The existing endpoint is named `GET /api/kanban/wip-limits` based on context in the codebase. The Backend Engineer must decide whether to rename it to `column-configs` (preferred — more accurate now that it carries two concerns) or extend the existing route. Renaming requires updating every client caller. Check `src/` for usages of `wip-limits` before deciding.

The `revalidatePath` call is the correct Next.js 16 App Router pattern for invalidating cached server component data after a mutation. The exact path string must match the file-system route. If the board uses a layout group like `(app)`, the path argument should be the URL path (`/board`), not the file path.

The hidden-tickets badge count is derived from the board data fetch (the board already queries all tickets for the active team). No extra round-trip is needed on initial board load. The `HiddenTicketsPanel` defers its full ticket list fetch to when the user clicks the badge, keeping the board load fast.

Do not add a `NOT NULL` constraint on `hidden` without a default — SQLite will reject the migration for existing rows. The `@default(false)` in the Prisma schema handles this correctly.
