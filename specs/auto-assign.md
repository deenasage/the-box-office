# Feature: Auto-Assign Tickets to Sprint

## Overview

A planning tool that runs skillset-aware matching logic to propose sprint assignments for unscheduled tickets. The system generates a draft assignment list, shows it in a review modal, and commits only after explicit user approval. No DB writes occur during the preview phase. This is a local-only, deterministic algorithm — no AI or external API involved.

---

## Data Model

No new models required. This feature reads from and writes to existing entities only.

### Entities read during preview

| Entity | Fields used |
|---|---|
| `Ticket` | `id`, `title`, `team`, `status`, `size`, `sprintId`, `assigneeId`, `requiredSkillsetId` |
| `Sprint` | `id`, `name`, `startDate`, `endDate`, `isActive` |
| `User` | `id`, `name`, `team`, `skillsets` (via `UserSkillset`) |
| `UserSkillset` | `userId`, `skillsetId` |
| `Skillset` | `id`, `name`, `color` |
| `TeamCapacity` | `sprintId`, `userId`, `hours` |

### How committed hours are calculated

For a given user + sprint, committed hours = sum of `SIZE_HOURS[ticket.size]` across all tickets where `ticket.sprintId = targetSprintId` AND `ticket.assigneeId = userId`. This uses the existing `SIZE_HOURS` map from `src/lib/utils.ts`.

### Entities written on commit

| Entity | Fields written |
|---|---|
| `Ticket` | `sprintId`, `assigneeId`, `status` (set to `TODO` if currently `BACKLOG`) |

No new fields. No schema migration required.

---

## Matching Algorithm

The preview endpoint executes this logic server-side. It is pure computation — no writes.

### Step 1 — Candidate ticket selection

Collect tickets where ALL of:
- `status` is `BACKLOG` or `TODO`
- `sprintId` is `null` (not yet assigned to any sprint)
- `size` is non-null (unsized tickets are excluded — cannot calculate load)

Exclude tickets that have open `BLOCKS` dependencies on other unresolved tickets. A ticket that is blocked by incomplete work must not be auto-assigned.

### Step 2 — Candidate assignee pool per ticket

For each candidate ticket:
- Determine the ticket's `team`
- If `requiredSkillsetId` is non-null: candidate assignees = users where `user.team = ticket.team` AND `userId` appears in `UserSkillset` with that `skillsetId`
- If `requiredSkillsetId` is null: candidate assignees = all users where `user.team = ticket.team`
- If candidate pool is empty after filtering: ticket is flagged as `UNASSIGNABLE` and included in the review screen with a warning — it is NOT silently dropped

### Step 3 — Assignee selection (least-loaded)

For each ticket, pick the candidate with the lowest committed hours in `targetSprintId`. Committed hours are calculated from all tickets already assigned to that sprint plus any tickets proposed earlier in the current preview run (order matters — process tickets in descending `priority` order, then ascending `createdAt` as tiebreaker).

### Step 4 — Capacity guard

If the picked assignee's committed hours (existing + proposed) would exceed their `TeamCapacity.hours` for the target sprint, the ticket is flagged `OVER_CAPACITY` in the review row. It is still included in the proposal — the user decides whether to override or reassign.

If no `TeamCapacity` record exists for the user in the target sprint, capacity is treated as unlimited (no flag).

---

## User Stories

- As an Admin or Team Lead, I can click "Auto-assign to Sprint" on the sprint detail page so that I can populate a sprint with appropriately skilled members in one action.
- As a planner, I can review the proposed assignments before they are committed so that I can catch bad matches and override them.
- As a planner, I can change the proposed assignee or sprint for any row in the review screen so that edge cases do not require me to cancel and redo the entire flow.
- As a planner, I can see which tickets could not be matched (UNASSIGNABLE) so that I know which tickets need manual attention.
- As a planner, I can cancel the review without committing so that no DB state is changed if I change my mind.

---

## Acceptance Criteria

- [ ] "Auto-assign to Sprint" button is visible on the sprint detail page. It is only rendered for users with `role = ADMIN` or `role = TEAM_LEAD`.
- [ ] Clicking the button calls `POST /api/tickets/auto-assign/preview` with the current sprint's ID and shows a loading state on the button during the request.
- [ ] The review modal opens when the preview response arrives.
- [ ] The review table shows one row per candidate ticket with columns: Ticket title | Team | Required Skillset | Proposed Assignee | Committed Hours (post-assignment) | Capacity Hours | Size | Flag.
- [ ] Rows flagged `UNASSIGNABLE` display a warning chip and have the assignee dropdown disabled.
- [ ] Rows flagged `OVER_CAPACITY` display an amber warning chip but remain editable.
- [ ] Each row's Proposed Assignee column is a dropdown of all eligible members for that ticket's team.
- [ ] Each row's Sprint column is a dropdown of all future and active sprints (fetched once when the modal opens).
- [ ] Clicking "Approve All" calls `POST /api/tickets/auto-assign/commit` with the current state of the review array (including any user edits).
- [ ] On successful commit, the modal closes, the page refreshes, and a success toast shows the count of tickets assigned.
- [ ] On commit failure, an error toast is shown and the modal stays open so the user does not lose their edits.
- [ ] Clicking "Cancel" closes the modal with no DB writes.
- [ ] Tickets with `size = null` are excluded from the preview and are NOT shown in the review screen (they are silently skipped — the user learns about this from the button tooltip).
- [ ] The button tooltip reads: "Unsized tickets are excluded from auto-assignment."

---

## API Contract

### `POST /api/tickets/auto-assign/preview`

**Request body**
```ts
{
  targetSprintId: string;     // required — the sprint to assign tickets into
  teamFilter?: Team;          // optional — restrict to one team's tickets
}
```

**Response 200**
```ts
{
  proposals: AutoAssignProposal[];
  skippedCount: number;        // tickets excluded (unsized or already assigned)
}
```

**`AutoAssignProposal` shape**
```ts
interface AutoAssignProposal {
  ticketId: string;
  ticketTitle: string;
  team: Team;
  size: TicketSize;
  requiredSkillset: { id: string; name: string; color: string } | null;
  proposedAssigneeId: string | null;          // null if UNASSIGNABLE
  proposedAssigneeName: string | null;
  proposedSprintId: string;
  committedHoursAfter: number;                // assignee's total if this assignment is made
  capacityHours: number | null;               // from TeamCapacity, null if not set
  flag: "OK" | "OVER_CAPACITY" | "UNASSIGNABLE";
}
```

No DB writes. Returns 400 if `targetSprintId` does not exist.

---

### `POST /api/tickets/auto-assign/commit`

**Request body**
```ts
{
  assignments: CommitAssignment[];
}

interface CommitAssignment {
  ticketId: string;
  assigneeId: string | null;   // null = leave unassigned (user cleared the field)
  sprintId: string;
}
```

**Response 200**
```ts
{
  updatedCount: number;
  errors: { ticketId: string; message: string }[];
}
```

Each assignment is applied individually in a Prisma transaction. If one ticket update fails, it is added to `errors` and the rest still commit. The endpoint does NOT roll back all on partial failure — partial success is acceptable and surfaced to the user.

For each committed ticket:
- Set `Ticket.sprintId = assignment.sprintId`
- Set `Ticket.assigneeId = assignment.assigneeId`
- If `Ticket.status === BACKLOG`, set `Ticket.status = TODO`
- Write a `TicketStatusHistory` record if status changed

Returns 400 if `assignments` is empty or missing.

---

## Component List

| Component | File | Notes |
|---|---|---|
| `AutoAssignButton` | `src/components/sprints/AutoAssignButton.tsx` | Button + loading state + tooltip. Calls preview, passes result to modal. |
| `AutoAssignReviewModal` | `src/components/sprints/AutoAssignReviewModal.tsx` | Dialog containing the review table and Approve/Cancel. Receives `proposals` + `allSprints` + `teamMembers` as props. |
| `AutoAssignRow` | `src/components/sprints/AutoAssignRow.tsx` | Single editable row in the review table. Manages local assignee/sprint state. |

`AutoAssignButton` is a Client Component. It fetches the preview and manages modal open state. It is added to the sprint detail page header alongside `AddFromBacklog`.

`AutoAssignReviewModal` receives proposals as props (no internal fetch). It holds the mutable draft of the reviewed assignments in `useState`. On approve, it calls the commit endpoint with the current draft state.

---

## Build Order

1. Backend Engineer: implement `POST /api/tickets/auto-assign/preview` — algorithm only, no writes
2. Backend Engineer: implement `POST /api/tickets/auto-assign/commit` — transactional writes with status history
3. Frontend Engineer: build `AutoAssignRow`, then `AutoAssignReviewModal`, then `AutoAssignButton`
4. Frontend Engineer: wire `AutoAssignButton` into the sprint detail page header

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| All backlog tickets are unsized | Preview returns empty `proposals`, `skippedCount > 0`. Button shows toast: "No sized tickets available to assign." |
| Target sprint has no `TeamCapacity` records | Capacity guard is skipped for all rows. No `OVER_CAPACITY` flags are raised. |
| A ticket's required skillset exists but no team member holds it | Ticket is flagged `UNASSIGNABLE`. It appears in the review table with assignee = "None available" and the dropdown is disabled. |
| User removes the proposed assignee from a row | `assigneeId` is set to `null` in the commit payload. The ticket is assigned to the sprint without an assignee. Status still transitions from BACKLOG to TODO. |
| User changes the sprint on a row to a past sprint | The dropdown should only show future and active sprints. Past sprints are excluded from the dropdown list. |
| A ticket has a BLOCKS dependency on an unresolved ticket | Excluded from proposals. Counted in `skippedCount`. |
| Two tickets require the same skillset and only one member holds it | Both are proposed to the same member. The second ticket will be flagged `OVER_CAPACITY` if the combined load exceeds capacity. User must manually reassign one. |
| Commit is called with an empty assignments array | Returns 400. |
| User approves and a ticket has since been assigned manually | The commit endpoint applies the patch regardless. Last write wins. No conflict detection in Phase 1. |

---

## Out of Scope (Phase 1)

- Conflict detection when a ticket is assigned manually between preview and commit
- Drag-and-drop reordering of rows in the review modal
- Saving a preview as a "draft plan" without committing
- Auto-sizing unsized tickets before assignment
- Round-robin assignment mode (as an alternative to least-loaded)
- Notification to assignees when tickets are committed to them

---

## Architect's Notes

The preview endpoint must build the full in-memory assignment map before returning — it cannot paginate or stream. For realistically sized backlogs (< 500 tickets) on a local SQLite database this is acceptable. If the backlog grows beyond this, Phase 2 should add a `teamFilter` pagination layer.

The commit endpoint uses individual per-ticket updates inside one transaction block, not a Prisma `updateMany`. This is deliberate: `updateMany` cannot write `TicketStatusHistory` records atomically per ticket. The tradeoff is slightly more DB round-trips, which is acceptable for local SQLite.

`AutoAssignButton` must be placed on the sprint **detail** page (e.g., `/sprints/[id]`), not the sprint **list** page. The list page has no single target sprint context. The spec for the sprint detail page (sprint-scrum.md) should be updated to show this button in the page header.
