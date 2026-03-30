# Feature: Auto-Assign v2 — Sprint Planning Enhancement

## Overview

Auto-assign v1 delivered a working algorithm and review modal. It is functional but narrow: the
button is buried in the sprint detail header, the review modal gives no reasoning for each
assignment, users cannot remove a ticket from the plan without cancelling the entire session, and
there is no side-by-side view of backlog demand versus team capacity. This spec upgrades the
feature into a first-class sprint planning tool. A team lead opening `/sprints/[id]/plan` should
be able to go from an empty sprint to a fully loaded, capacity-balanced assignment plan in under
two minutes, with full transparency into why each ticket landed where it did.

---

## Gap Analysis of v1

This section documents every deficiency found in the existing implementation. Each gap maps to a
Phase in this spec.

### Discovery gaps
- The "Auto-assign Backlog" button is one of five unlabelled icon buttons in the sprint detail
  header (`SprintActionButtons`, `CloneSprintButton`, `AutoAssignButton`, `AddFromBacklog`,
  `BulkEstimateButton`). A new team lead will not find it without asking.
- There is no sprint planning view. The only way to see the backlog and sprint tickets together
  is to open two browser tabs.
- The feature is unreachable from the backlog (`/tickets`) and the capacity page (`/capacity`).

### Configuration gaps
- No team filter UI is exposed. The `teamFilter` request field exists in the API but
  `AutoAssignButton` never sends it.
- No capacity-override toggle. Users cannot tell the algorithm to fill regardless of limits.
- No priority weighting UI confirmation. Priority ordering exists in the algorithm
  (`orderBy: [{ priority: "desc" }, { createdAt: "asc" }]`) but is invisible to the user.

### Algorithm gaps
- Unsized tickets are silently skipped. `skippedCount` is returned but the review modal does not
  display which specific tickets were skipped or why. Users have no prompt to go size them.
- No handling for tickets with status `BLOCKED`. These tickets have `sprintId: null` and
  `status: BLOCKED` — they would currently be excluded by the `status: { in: [BACKLOG, TODO] }`
  filter but should be explicitly counted and surfaced in skipped output.
- The blocking-ticket filter uses `dependenciesTo` (BLOCKS type). This is correct per the
  dependency model (`DependencyTo` = the ticket that is blocked; `DependencyFrom` = the blocker).
  However the flag logic is correct — leaving note here for clarity during code review.
- No skill gap warning at the team level. If a team has 10 tickets requiring "Motion Design" but
  only one person holds that skillset, all 10 are proposed to the same person. The algorithm
  produces OVER_CAPACITY flags but gives no higher-level warning that a skillset is a bottleneck.
- No dependency-ordering guarantee within the same sprint. If Ticket A BLOCKS Ticket B and both
  are assigned in the same run, Ticket A should be assigned first (sequenced earlier in the
  sprint). Currently the ordering is priority desc, createdAt asc — dependency order is not
  considered.

### Review screen gaps
- No "why" column. Users see the proposal but not the reasoning ("lowest load: 12h, has Visual
  Design skillset").
- No "Remove from plan" action per row. To exclude a single ticket the user must cancel the
  entire session.
- No capacity impact bar per assignee. Users must mentally sum hours across rows.
- No filter by flag status. To see only UNASSIGNABLE rows the user must scroll the entire table.
- Sprint column is read-only in the current `AutoAssignRow`. The spec says it should be a
  dropdown but the implementation renders plain text (`<span className="text-xs
  text-muted-foreground">{sprintName}</span>`). This is a v1 regression.
- No summary of skipped tickets with names and skip reasons.

### Post-commit gaps
- No undo. Once committed, assignments cannot be bulk-reverted without manually editing each
  ticket.
- No in-app notification to assignees. The `Notification` model exists and is unused here.
- The capacity view on the sprint detail page does not re-fetch after commit; it relies on
  `router.refresh()` which triggers a full RSC rerender. This works but is slow.

### Access gaps
- Feature is inaccessible from `/tickets` (backlog view).
- Feature is inaccessible from `/capacity`.

---

## Data Model

No new Prisma models required. Two additions to existing models.

### New field on `Ticket`

```prisma
model Ticket {
  // ... existing fields ...

  autoAssignSkipReason  String?  /// "UNSIZED" | "BLOCKED" | "ALREADY_ASSIGNED" — set during preview, cleared on assign
}
```

Wait — this would persist a UI-phase value to the DB, which is wrong. **Decision: skip reason
stays in-memory only.** The `skippedTickets` array in the preview response carries this data.
No schema change needed for skip reasons.

### No schema migration required for Phase 1 or Phase 2.

The `AutoAssignRun` audit model is deferred to Phase 3.

### Entities used (unchanged from v1, repeated here for completeness)

| Entity | Fields read | Fields written |
|---|---|---|
| `Ticket` | `id`, `title`, `team`, `status`, `size`, `priority`, `sprintId`, `assigneeId`, `requiredSkillsetId`, `dependenciesTo`, `dependenciesFrom` | `sprintId`, `assigneeId`, `status` |
| `Sprint` | `id`, `name`, `startDate`, `endDate`, `isActive` | — |
| `User` | `id`, `name`, `team`, `skillsets` (via `UserSkillset`) | — |
| `UserSkillset` | `userId`, `skillsetId` | — |
| `Skillset` | `id`, `name`, `color` | — |
| `TeamCapacity` | `sprintId`, `userId`, `hours` | — |
| `Notification` | — | `userId`, `message`, `link` |
| `TicketStatusHistory` | — | `ticketId`, `fromStatus`, `toStatus`, `changedById` |

---

## Updated API Contract

### `POST /api/tickets/auto-assign/preview` (updated)

**Request body**
```ts
{
  targetSprintId: string;
  teamFilter?: Team;                // optional — restrict to one team
  ignoreCapacity?: boolean;         // NEW: if true, no OVER_CAPACITY flags are raised
}
```

**Response 200** (extended)
```ts
{
  proposals: AutoAssignProposal[];     // assignable tickets with proposed assignments
  skippedTickets: SkippedTicket[];     // NEW: replaces opaque skippedCount number
  skillGapWarnings: SkillGapWarning[]; // NEW: bottleneck signals
  targetSprint: { id: string; name: string };
  availableAssignees: AvailableAssignee[];
}
```

**`AutoAssignProposal` (extended)**
```ts
interface AutoAssignProposal {
  ticketId: string;
  ticketTitle: string;
  team: Team;
  size: TicketSize;
  priority: number;                    // NEW: exposed for display
  requiredSkillset: { id: string; name: string; color: string } | null;
  proposedAssigneeId: string | null;
  proposedAssigneeName: string | null;
  proposedSprintId: string;
  committedHoursBefore: number;        // NEW: assignee's hours before this proposal
  committedHoursAfter: number;
  capacityHours: number | null;
  flag: "OK" | "OVER_CAPACITY" | "UNASSIGNABLE";
  matchReason: string;                 // NEW: human-readable explanation
  dependencyOrder: number;             // NEW: lower = should complete first in sprint
}
```

**`matchReason` generation rules (server-side)**

| Condition | matchReason string |
|---|---|
| No required skillset, lowest load | "Lowest load on {team} team ({n}h committed)" |
| Required skillset matched, lowest load | "Has {skillset}, lowest load ({n}h committed)" |
| Required skillset matched, only person | "Only {team} member with {skillset}" |
| OVER_CAPACITY | "Has {skillset}, but at capacity ({n}h / {cap}h)" |
| UNASSIGNABLE, no skillset holders | "No {team} member holds {skillset}" |
| UNASSIGNABLE, no team members | "No members assigned to {team} team" |

**`SkippedTicket` (new)**
```ts
interface SkippedTicket {
  ticketId: string;
  ticketTitle: string;
  team: Team;
  skipReason: "UNSIZED" | "BLOCKED" | "ALREADY_ASSIGNED";
  blockedByTicketId?: string;     // populated when skipReason = BLOCKED
  blockedByTicketTitle?: string;
}
```

**`SkillGapWarning` (new)**
```ts
interface SkillGapWarning {
  skillsetId: string;
  skillsetName: string;
  team: Team;
  ticketCount: number;         // tickets in this run requiring this skillset
  holderCount: number;         // team members who hold this skillset
  totalHoursRequired: number;  // sum of SIZE_HOURS for those tickets
  totalCapacityHours: number;  // sum of TeamCapacity.hours for those holders
}
```

A `SkillGapWarning` is emitted when `ticketCount > 1` and `holderCount === 1`, OR when
`totalHoursRequired > totalCapacityHours` for a given skillset.

**`AvailableAssignee` (extended)**
```ts
interface AvailableAssignee {
  id: string;
  name: string;
  team: Team;
  skillsets: { id: string; name: string }[];
  committedHours: number;    // NEW: current committed hours in targetSprint
  capacityHours: number | null; // NEW: from TeamCapacity
}
```

---

### `POST /api/tickets/auto-assign/commit` (unchanged interface, one behavior change)

Existing interface is correct. One behavior change: after a successful commit, write a
`Notification` record for each distinct `assigneeId` in the committed assignments.

**Notification format**
```ts
{
  userId: assigneeId,
  message: `You have been assigned ${count} ticket${count > 1 ? "s" : ""} in ${sprintName}`,
  link: `/sprints/${sprintId}`,
}
```

One notification per assignee, not one per ticket. If an assignee receives 3 tickets in one
commit, they get one notification: "You have been assigned 3 tickets in Sprint 4."

Group by `assigneeId` before writing. Skip notifications where `assigneeId` is null (unassigned
tickets).

---

### `POST /api/tickets/auto-assign/undo` (new — Phase 3)

See Phase 3 section. Not implemented in Phase 1 or 2.

---

## UX Flow

### Entry points (Phase 1: sprint detail; Phase 2: backlog, capacity)

**Entry point A — Sprint detail page `/sprints/[id]`** (exists, improved)
The "Auto-assign Backlog" button moves from the header button cluster into the "Tickets" section
header, alongside "Add from Backlog" and "Bulk Estimate". This makes the three ticket-population
actions visually grouped.

**Entry point B — Backlog view `/tickets`** (Phase 2)
A new "Assign to Sprint" button appears in the bulk-action bar when one or more backlog tickets
are selected. Clicking it opens the Planning Modal with those tickets pre-filtered.

**Entry point C — Capacity page `/capacity`** (Phase 2)
An "Auto-assign" button appears per sprint row in the capacity table. Clicking it launches the
planning session for that sprint.

---

### Step-by-step user journey (Phase 1)

```
1. Team lead opens /sprints/[id]
2. Team lead clicks "Auto-assign Backlog" in the Tickets section header
3. [NEW] Pre-flight config sheet opens (not a full modal — a Popover or Sheet)
   - "Teams to include" multiselect — defaults to all teams
   - "Ignore capacity limits" toggle — default OFF
   - "Run preview" button
4. Loading state on "Run preview" — ~200-800ms for local SQLite
5. [NEW] Sprint Planning Modal opens (full-screen dialog, not the old 5-col table modal)
   - Left panel: Backlog demand (proposals + skipped)
   - Right panel: Assignee load bars
6. User reviews proposals, edits assignees, removes unwanted rows
7. User clicks "Approve [n] assignments"
8. Toast: "12 tickets assigned to Sprint 4. 3 team members notified."
9. Modal closes, page refreshes
```

---

## Sprint Planning Modal (new component, replaces current review modal)

This is the primary UI change. The current `AutoAssignReviewModal` is a single scrollable table
with no context about team load. The new modal is a two-panel layout.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Plan Sprint 4  ·  14 proposals  ·  3 skipped                   │
│  [Filter: All ▾]  [Show skipped]                    [Approve 11] │
├──────────────────────────────────┬──────────────────────────────┤
│  PROPOSALS                       │  TEAM LOAD                    │
│                                  │                               │
│  ┌──────────────────────────┐    │  Alice Chen          ████░  │
│  │ Ticket title      [×]    │    │  14h / 20h  (70%)            │
│  │ Design · L · Visual      │    │                               │
│  │ Alice Chen ▾             │    │  Bob Kim             ████████│
│  │ "Has Visual Design,      │    │  22h / 20h  (110%)  OVER     │
│  │  lowest load (10h)"      │    │                               │
│  │ 14h after → 20h cap      │    │  Carlos Webb         ██░    │
│  └──────────────────────────┘    │  8h / 20h   (40%)            │
│                                  │                               │
│  ┌──────────────────────────┐    │  ── Skill Gap Warnings ──     │
│  │ ...                      │    │  Motion Design: 4 tickets,   │
│  └──────────────────────────┘    │  1 holder. Bottleneck risk.  │
│                                  │                               │
├──────────────────────────────────┴──────────────────────────────┤
│  [Cancel]                                          [Approve 11] │
└─────────────────────────────────────────────────────────────────┘
```

### Left panel — proposal cards

Each proposal renders as a card (not a table row). Cards are more scannable and allow for the
match reason text without cramping columns.

**ProposalCard contents**
- Ticket title (truncated at 60 chars, full title in `title` attribute)
- Team badge + Size badge + Priority indicator (colored dot)
- Required skillset badge (if set)
- Assignee dropdown — filtered to eligible team members with their current committed hours shown
  in the option label: "Alice Chen (14h / 20h)"
- Match reason text in muted style below the dropdown
- Hours impact: "{n}h committed after → {cap}h capacity" or "{n}h committed (no cap set)"
- Flag chip: OK (green) / OVER CAPACITY (amber) / UNASSIGNABLE (amber)
- [x] remove button — clicking this removes the card from the proposals list entirely

**Remove behavior**
Removing a card does not cancel the session. The removed ticket stays in the backlog (it was
never committed). The count in "Approve [n]" decrements. Removed cards are not sent in the
commit payload.

### Right panel — assignee load bars

- One row per assignee who appears in any proposal
- Horizontal load bar: filled = committed hours after all current proposals, background = capacity
- Color: green (<= 80%), amber (81-100%), red (>100%)
- Load bars update in real-time as the user changes assignees in the left panel
- Assignees not in any proposal are not shown (panel is not a full team roster)

**Skill gap warning section** (below load bars)
- One warning chip per `SkillGapWarning` from the preview response
- Format: "{skillset}: {n} tickets, {m} holder(s). {totalHours}h required, {capHours}h available."
- Color: amber border

### Skipped tickets section (collapsible, default collapsed)

- Toggle: "Show {n} skipped tickets"
- Renders a compact list: Ticket title | Skip reason | (if BLOCKED) "Blocked by: [title]"
- For UNSIZED tickets: "Go to ticket" link so the planner can size and re-run
- No action available for BLOCKED tickets from this panel

### Filter bar

Dropdown filter above the left panel with options:
- All (default)
- OK only
- Over capacity
- Unassignable
- Removed (shows tickets the user removed in this session, with a "restore" option)

---

## Component List

| Component | File | Phase | Props summary |
|---|---|---|---|
| `AutoAssignConfigSheet` | `src/components/sprints/AutoAssignConfigSheet.tsx` | 1 | `sprintId`, `sprintName`, `onRun(config)` |
| `SprintPlanningModal` | `src/components/sprints/SprintPlanningModal.tsx` | 1 | `open`, `onClose`, `proposals`, `skippedTickets`, `skillGapWarnings`, `availableAssignees`, `targetSprint` |
| `ProposalCard` | `src/components/sprints/ProposalCard.tsx` | 1 | `row: ProposalRow`, `availableAssignees`, `onAssigneeChange`, `onRemove` |
| `AssigneeLoadPanel` | `src/components/sprints/AssigneeLoadPanel.tsx` | 1 | `assignees: AssigneeLoadEntry[]` — recomputed from live proposal state |
| `SkillGapWarningList` | `src/components/sprints/SkillGapWarningList.tsx` | 1 | `warnings: SkillGapWarning[]` |
| `SkippedTicketsList` | `src/components/sprints/SkippedTicketsList.tsx` | 1 | `skippedTickets: SkippedTicket[]` |
| `AutoAssignButton` | `src/components/sprints/AutoAssignButton.tsx` | 1 | existing, updated to open config sheet |

### Deprecated in Phase 1 (replace, do not delete until migration confirmed)

| Component | Status |
|---|---|
| `AutoAssignReviewModal` | Replaced by `SprintPlanningModal` |
| `AutoAssignRow` | Replaced by `ProposalCard` |

---

### `AutoAssignConfigSheet` props

```ts
interface AutoAssignConfig {
  teams: Team[];           // which teams to include; defaults to all
  ignoreCapacity: boolean; // default false
}

interface AutoAssignConfigSheetProps {
  sprintId: string;
  sprintName: string;
  onRun: (config: AutoAssignConfig) => Promise<void>;
  loading: boolean;
}
```

The sheet renders as a `Sheet` (shadcn/ui drawer) from the right side. It is small — two
controls and a button. Not a full dialog.

---

### `SprintPlanningModal` internal state

```ts
// Held in useState inside SprintPlanningModal
interface PlanningState {
  rows: ProposalRow[];             // mutable draft; initialized from proposals prop
  removedIds: Set<string>;         // ticketIds removed by user
  filter: "ALL" | "OK" | "OVER_CAPACITY" | "UNASSIGNABLE" | "REMOVED";
  showSkipped: boolean;
}
```

`rows` is the single source of truth for the right panel load bars. Every `onAssigneeChange`
and `onRemove` mutates `rows` via `setRows`.

**Derived assignee load map** (computed from `rows` on every render, not stored in state)
```ts
// Computed inside SprintPlanningModal render
const liveLoadMap: Map<string, { hours: number; capacity: number | null; name: string }> =
  // sum committedHoursAfter from non-removed rows for each unique proposedAssigneeId
```

This recomputation is fast for < 500 rows on local hardware. No `useMemo` required in Phase 1.

---

### `ProposalCard` assignee dropdown option format

Each option in the assignee dropdown shows:

```
Alice Chen  ·  14h / 20h
```

If capacity is not set: `Alice Chen  ·  14h`

Options are sorted by current committed hours ascending (least loaded first) so the system's
recommendation appears at the top.

---

## Algorithm Improvements

### Improvement 1 — Expose `ignoreCapacity` flag

When `ignoreCapacity: true` in the request:
- Skip the capacity guard step entirely
- All flags default to `OK` (no OVER_CAPACITY)
- The `matchReason` appends " (capacity ignored)" to the reason string

### Improvement 2 — Named skipped tickets in response

Replace `skippedCount: number` with `skippedTickets: SkippedTicket[]`. The count is derived
from the array length client-side. The old field is removed from the response.

**Skip reason derivation**
```
UNSIZED        → ticket.size === null
BLOCKED        → ticket has a BLOCKS dependency where fromTicket.status !== DONE
ALREADY_ASSIGNED → ticket.sprintId !== null (defensive — the where clause should exclude these,
                   but log any that slip through)
```

### Improvement 3 — Skill gap warnings

After the matching algorithm runs, scan the proposals map:
```
For each unique requiredSkillsetId in proposals:
  holderCount = count of users in candidatePool who hold that skillset
  ticketCount = count of proposals with that requiredSkillsetId
  totalHoursRequired = sum of SIZE_HOURS for those proposals
  totalCapacityHours = sum of TeamCapacity.hours for holders (null hours = treat as unlimited, exclude from sum)

  Emit warning if:
    (holderCount === 1 AND ticketCount > 1)
    OR (totalHoursRequired > totalCapacityHours AND totalCapacityHours > 0)
```

### Improvement 4 — Dependency order field

After the matching algorithm, run a topological sort on the proposals using BLOCKS dependencies
within the proposal set. Assign each proposal a `dependencyOrder` integer (0-indexed). Proposals
with no dependencies all get order 0. A ticket that depends on another proposed ticket gets a
higher order.

This field is display-only in Phase 1 (shown as a sort order in the left panel). It is not
written to the DB.

The sort algorithm:
1. Build adjacency list from `dependenciesFrom` on each proposed ticket (only considering edges
   where both tickets are in the proposals set)
2. Kahn's algorithm (BFS topological sort) — cycle-safe since Prisma's unique constraint on
   `[fromTicketId, toTicketId, type]` prevents self-loops, but cycles are theoretically possible
   via indirect chains
3. If a cycle is detected, assign all cycle members `dependencyOrder = 0` and log a warning

### Improvement 5 — Status `BLOCKED` exclusion (explicit)

The existing algorithm excludes `BLOCKED` status tickets via the `status: { in: [BACKLOG, TODO]
}` where clause. This is correct. The change in v2 is to explicitly count and name these tickets
in `skippedTickets` with `skipReason: "BLOCKED"` rather than lumping them into `skippedCount`.

Note: A ticket with `status: BLOCKED` is different from a ticket that has a BLOCKS dependency.
Both are excluded. Both are now named in the skipped list.

---

## User Stories

- As a team lead, I can open a config sheet before running auto-assign so that I can choose which teams to include and whether to override capacity limits.
- As a team lead, I can see why each ticket was matched to a specific person so that I can make informed overrides without guessing.
- As a team lead, I can remove individual tickets from the plan without cancelling the session so that I do not lose all my other edits.
- As a team lead, I can see live-updating load bars for each assignee as I edit the plan so that I can spot overloads without mental arithmetic.
- As a team lead, I can see a skill gap warning when one person holds a bottleneck skillset so that I can escalate a resourcing problem before committing.
- As a team lead, I can see exactly which tickets were skipped and why so that I know what manual action is required after committing.
- As a team member, I receive an in-app notification when I am assigned tickets in a sprint so that I do not need to check manually.
- As a team lead, I can filter the proposal list by flag status so that I can focus on problem rows without scrolling.

---

## Acceptance Criteria

### Phase 1 — Core UX overhaul

- [ ] Clicking "Auto-assign Backlog" opens `AutoAssignConfigSheet`, not the preview directly.
- [ ] Config sheet has a "Teams to include" multiselect (all teams checked by default) and an "Ignore capacity limits" toggle (default off).
- [ ] Clicking "Run Preview" in the config sheet calls `POST /api/tickets/auto-assign/preview` with the selected config, shows loading state.
- [ ] `SprintPlanningModal` opens when preview response arrives with proposals.length > 0.
- [ ] Left panel shows one `ProposalCard` per proposal, sorted by `dependencyOrder` ascending then `priority` descending.
- [ ] Each `ProposalCard` displays: title, team badge, size badge, priority dot, skillset badge, assignee dropdown, match reason text, hours impact line, flag chip, remove [x] button.
- [ ] Assignee dropdown options show committed hours and capacity in the option label.
- [ ] Clicking [x] on a card removes it from the left panel and decrements the "Approve [n]" count. The right panel load bars update immediately.
- [ ] Right panel `AssigneeLoadPanel` shows one row per assignee appearing in any non-removed proposal. Load bar fills based on live proposal state.
- [ ] Load bar color: green <= 80%, amber 81-100%, red > 100%.
- [ ] `SkillGapWarningList` renders below load bars when `skillGapWarnings.length > 0`.
- [ ] "Show skipped" toggle expands `SkippedTicketsList` with ticket name and skip reason.
- [ ] UNSIZED entries in `SkippedTicketsList` include a "Go to ticket" link to `/tickets/[id]`.
- [ ] Filter dropdown above left panel filters cards to: ALL / OK / OVER CAPACITY / UNASSIGNABLE / REMOVED.
- [ ] REMOVED filter shows cards the user removed with a "Restore" button that adds them back.
- [ ] "Approve [n]" button submits only non-removed, non-UNASSIGNABLE rows to the commit endpoint.
- [ ] Sprint column per proposal is a dropdown of future and active sprints (the v1 regression is fixed).
- [ ] On successful commit: modal closes, page refreshes, toast shows "N tickets assigned. M team members notified."
- [ ] On partial commit failure: modal stays open, error toast lists failed ticket IDs, successfully committed rows are highlighted as committed (not editable).
- [ ] In-app `Notification` records are written for each distinct assignee on commit.
- [ ] Existing `AutoAssignRow` and `AutoAssignReviewModal` are preserved but no longer wired to `AutoAssignButton`. They can be removed in a follow-up cleanup PR.

### Phase 1 — Algorithm updates

- [ ] Preview response includes `skippedTickets: SkippedTicket[]` with `ticketId`, `ticketTitle`, `team`, `skipReason`, and `blockedByTicketId/Title` when applicable.
- [ ] `skippedCount` field is removed from the response (breaking change — `AutoAssignButton` updated accordingly).
- [ ] Preview response includes `skillGapWarnings: SkillGapWarning[]`.
- [ ] Each `AutoAssignProposal` includes `matchReason: string`, `committedHoursBefore: number`, `dependencyOrder: number`, and `priority: number`.
- [ ] `ignoreCapacity: boolean` request field is accepted and suppresses OVER_CAPACITY flags when true.
- [ ] `availableAssignees` response includes `committedHours` and `capacityHours` per assignee.
- [ ] Topological dependency order is computed and assigned to each proposal.

### Phase 2 — Access from backlog and capacity (separate build)

- [ ] Backlog view bulk-action bar shows "Assign to Sprint" when tickets are selected.
- [ ] Capacity page sprint rows show "Auto-assign" button.
- [ ] Both entry points open `AutoAssignConfigSheet` with the sprint pre-selected.

### Phase 3 — Undo (separate build)

- [ ] Sprint detail page shows "Undo last auto-assign" button for 30 minutes after a commit, visible only to ADMIN and TEAM_LEAD.
- [ ] Undo calls `POST /api/tickets/auto-assign/undo` with a run ID.
- [ ] Undo reverts: clears `sprintId`, clears `assigneeId`, reverts `status` from TODO back to BACKLOG, writes `TicketStatusHistory` records for each reverted ticket.

---

## Build Order

### Phase 1

1. **Backend Engineer**: Update `POST /api/tickets/auto-assign/preview`
   - Add `ignoreCapacity` request field
   - Replace `skippedCount` with `skippedTickets: SkippedTicket[]`
   - Add `matchReason` to each proposal
   - Add `committedHoursBefore` to each proposal
   - Add `priority` to each proposal
   - Add `dependencyOrder` via topological sort
   - Add `skillGapWarnings` computation
   - Extend `availableAssignees` with `committedHours` and `capacityHours`
   - Remove `skippedCount` from response

2. **Backend Engineer**: Update `POST /api/tickets/auto-assign/commit`
   - After successful writes, group assignments by assigneeId
   - Write one `Notification` record per distinct non-null assigneeId
   - Return `notifiedCount` in the response body alongside `updatedCount` and `errors`

3. **Frontend Engineer**: Build `AutoAssignConfigSheet`
   - shadcn/ui `Sheet` component, right side
   - Teams multiselect using shadcn `Checkbox` list
   - Ignore capacity `Switch`
   - "Run Preview" button with loading state

4. **Frontend Engineer**: Build `AssigneeLoadPanel` and `SkillGapWarningList`
   - `AssigneeLoadPanel` accepts `AssigneeLoadEntry[]` and renders load bars
   - Load bar uses the same `LoadBar` pattern as `SkillsetCapacityPanel`
   - `SkillGapWarningList` renders warning chips

5. **Frontend Engineer**: Build `ProposalCard`
   - Replaces `AutoAssignRow`
   - Card layout, not table row
   - Assignee dropdown with hours in option labels
   - Match reason text
   - Hours impact line
   - Flag chip
   - Remove [x] button

6. **Frontend Engineer**: Build `SkippedTicketsList`
   - Collapsible, default collapsed
   - Links to `/tickets/[id]` for UNSIZED entries

7. **Frontend Engineer**: Build `SprintPlanningModal`
   - Two-panel layout
   - Filter bar
   - Left panel: filtered `ProposalCard` list
   - Right panel: `AssigneeLoadPanel` + `SkillGapWarningList`
   - Skipped section with `SkippedTicketsList`
   - Approve/Cancel footer
   - Live load map derivation on each render

8. **Frontend Engineer**: Wire `AutoAssignButton` to `AutoAssignConfigSheet`
   - Update `AutoAssignButton` to open `AutoAssignConfigSheet`
   - Pass preview result to `SprintPlanningModal`
   - Update commit success toast to include notified count

9. **Frontend Engineer**: Move button location
   - Move `AutoAssignButton` from page header button cluster to Tickets section header
   - Group with `AddFromBacklog` and `BulkEstimateButton`

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| All backlog tickets are unsized | `proposals` is empty. `skippedTickets` contains all tickets with `skipReason: UNSIZED`. Modal does not open. Toast: "No sized tickets to assign. {n} tickets need sizing — click a ticket to set its size." |
| User removes all cards from left panel | "Approve [0]" button is disabled. Cancel is still available. |
| User changes assignee on a card to someone over capacity | Card flag updates to OVER_CAPACITY immediately. Right panel load bar turns amber/red. |
| User changes assignee on a card to "Unassigned" (clears field) | Match reason becomes "Unassigned". Hours impact line is removed. Flag is OK. Load bars update. |
| Sprint has no TeamCapacity records | No OVER_CAPACITY flags regardless of `ignoreCapacity` setting. Load bars render with filled bar and no capacity cap label. |
| User opens config sheet, deselects all teams | "Run Preview" is disabled until at least one team is selected. |
| Two proposals share the same assignee; user removes one | Right panel load bar for that assignee decreases. The remaining proposal's `committedHoursAfter` value shown in the card is now stale (it was computed at preview time). Note: the displayed hours in the card body reflect the preview snapshot, not live recalculation. Only the right panel load bar is live. This is acceptable for Phase 1. Phase 2 may recalculate per-card hours live. |
| Cycle detected in dependency graph | All cycle members get `dependencyOrder: 0`. A non-blocking console warning is logged server-side. No user-facing error. |
| Commit is called after a ticket was manually assigned between preview and commit | Commit applies regardless. The existing "last write wins" behavior from v1 is unchanged. Phase 3 adds conflict detection. |
| BLOCKED status tickets appear in the skipped list | Their `skipReason` is `BLOCKED`. If the block is from another ticket in the proposals set, `blockedByTicketId` and `blockedByTicketTitle` are populated. |
| `notifiedCount` in commit response differs from `updatedCount` | Normal — assigneeId may be null for some assignments. Toast shows both counts: "N tickets assigned. M team members notified." |

---

## Out of Scope

### Phase 1 Out of Scope
- Drag-and-drop reordering of proposal cards (Phase 2)
- Live per-card committed hours recalculation when user swaps assignees (Phase 2 — right panel is live, card body is snapshot)
- Saving a plan as a draft without committing (Phase 3)
- Round-robin assignment mode (Phase 3)
- Conflict detection between preview and commit (Phase 3)

### Phase 2 Out of Scope
- Undo (Phase 3)
- AutoAssignRun audit model (Phase 3)
- Backfilling dependency orders to already-committed tickets (never)

### Phase 3 Out of Scope
- Multi-sprint planning in one session (not planned)
- Calendar integration or leave-aware capacity (not planned — local-only constraint)

---

## Architect's Notes

**Why cards instead of table rows.** The v1 table row compresses seven columns into a fixed-width
dialog. The match reason text cannot fit without truncation. Cards give each proposal vertical
space proportional to its complexity. The tradeoff is reduced density — a planner with 40
proposals will need to scroll. The filter bar mitigates this by letting them see only problem rows.

**Why a config sheet instead of inline options on the button.** The button already carries a
loading state and a tooltip. Adding a dropdown or popover to it creates a compound interaction
that is easy to misclick. A drawer sheet makes the configuration step explicit and separate from
the run action. Users who want defaults can hit "Run Preview" immediately; the sheet adds one
click for the first-time setup.

**Why `skippedTickets` instead of `skippedCount`.** The count was useless to a planner. They
need to know which tickets to go size. "3 tickets skipped" prompts no action. "Ticket X, Y, Z
skipped — unsized" prompts immediate action. The API change is breaking but `AutoAssignButton` is
the only consumer, and it is updated in the same build step.

**Why live load bars but not live per-card hours.** Recalculating per-card committed hours when
the user swaps assignees requires re-running the full allocation algorithm in the browser on every
change (because proposals are interdependent — moving Alice off ticket 1 changes her available
hours for tickets 3 and 7). That is expensive and complex. The right panel load bars are simpler:
they just sum `SIZE_HOURS[size]` across non-removed cards per assignee. This gives the planner
accurate real-time feedback on load distribution without requiring full algorithm re-execution.

**Why one notification per assignee, not per ticket.** The `Notification` model has no
grouping mechanism. Sending one notification per ticket during a 20-ticket auto-assign run would
flood the notification inbox. One batched notification per assignee per commit run is the right
default. Phase 3 can add a digest preference setting if needed.

**The v1 sprint column regression.** `AutoAssignRow` renders the sprint as plain text despite the
v1 spec saying it should be an editable dropdown. This is fixed in `ProposalCard` with a proper
`Select` component. The dropdown must fetch active and future sprints — these should be passed
into the modal as props by `AutoAssignButton` (fetched alongside the preview call, reusing the
existing `allSprints` prop pattern from the v1 spec).

**Topological sort scope.** The dependency order field is display-only in Phase 1. It surfaces
to the planner which tickets need to be done before others within the same sprint. It does not
affect commit order (tickets are committed in parallel). A future enhancement could write
`Ticket.priority` based on dependency order, but that is out of scope.
