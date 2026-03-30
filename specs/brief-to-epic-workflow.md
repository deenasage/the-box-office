# Feature: Brief-to-Epic Workflow

## Overview

A six-phase workflow that takes a project brief from initial draft through stakeholder review, AI-assisted ticket scoping, multi-team epic creation, Gantt chart generation, roadmap integration, and sprint carryover approval. The workflow is the primary path for converting a project idea into a fully planned, roadmap-visible body of work. Each phase gates the next — a brief must be approved before scoping, an epic must have an end date before it appears on the roadmap.

---

## Submission Paths

Two parallel intake paths coexist — neither replaces the other.

| Path | Entry point | Use case |
|---|---|---|
| **Quick ticket** | `/submit-request` (existing intake form) | Simple, single-team requests that do not need a full brief — "update page copy", "fix SEO tag", etc. Any internal user. |
| **Brief-backed ticket** | Brief detail page → "Create Tickets" button | Complex projects requiring scoping, multi-team coordination, and a Gantt plan. PMs and team leads only. |

The `POST /api/intake` and Submit Request form are not modified by this workflow. The "Create Tickets" flow is an additional action on the Brief detail page (`/briefs/[id]`), gated behind `APPROVED` status and `ADMIN` / `TEAM_LEAD` role.

---

## What Already Exists

| Entity / Route | Status | Notes |
|---|---|---|
| `Brief` model | Exists | Has `DRAFT`, `REVIEW`, `FINALIZED`, `ARCHIVED` statuses. Missing `APPROVED` status. |
| `BriefAttachment` model | Exists | Brief-level file uploads only. No ticket-level attachment model. |
| `Epic` model | Exists | Has `startDate`, `endDate`, `status`, `team`. No Gantt or carryover linkage. |
| `RoadmapItem` model | Exists | Has `period`, `title`, `initiative`, `status`, `startDate`, `endDate`. No `epicId` FK. |
| `TicketDependency` model | Exists | `BLOCKS` / `BLOCKED_BY` / `RELATED` types. `detectedBy` supports `AI`. |
| `AIEstimate` model | Exists | Per-ticket size suggestion with `rationale`, `confidence`, `accepted` flag. |
| `Sprint` model | Exists | Has `isActive`. No carryover suggestion model. |
| `GET/POST /api/briefs` | Exists | Auth-gated. Returns DRAFT+REVIEW statuses. |
| `GET/PATCH/DELETE /api/briefs/[id]` | Exists | PATCH blocked on FINALIZED/ARCHIVED briefs. |
| `GET/POST /api/epics` | Exists | POST restricted to ADMIN/TEAM_LEAD. |
| `PATCH/DELETE /api/epics/[id]` | Exists | PATCH accepts `status`, `startDate`, `endDate`. |
| `GET/POST /api/roadmap-items` | Exists | Manual creation only. No auto-creation from epics. |

### Schema gaps that block this feature

1. `BriefStatus` enum missing `APPROVED` value.
2. `RoadmapItem` has no `epicId` foreign key — auto-creation from an epic is not trackable.
3. No `BriefShareToken` model.
4. No `BriefComment` model.
5. No `TicketAttachment` model.
6. No `GanttItem` model.
7. No `SprintCarryoverSuggestion` model.

---

## Data Model Additions

### 1. BriefShareToken

Purpose: Allows the PM to share a brief with external stakeholders who do not have a login. Tokens are permanent (never expire) and can be revoked by the PM at any time.

The share link is stored on both the `BriefShareToken` and the `Ticket` (via `Brief.shareTokens`) so teams can refer back to the original brief review during delivery.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `briefId` | String | FK → `Brief.id`, cascade delete |
| `token` | String | Unique random string (256-bit hex). Index this. |
| `label` | String? | Optional PM-set label, e.g. "Shared with Acme team". |
| `revoked` | Boolean | Default false. Set to true to revoke. No expiry field — tokens are permanent. |
| `createdAt` | DateTime | auto |

Constraints:
- `@@unique([token])`
- `@@index([briefId])`

**Confirmed:** Tokens never expire. No `expiresAt` field. Revocation is the only way to invalidate a token.

### 2. BriefComment

Purpose: Stores stakeholder feedback left during the share-token review flow. No authentication required to post — identity is self-reported.

**Confirmed:** No in-app notifications for brief comments in Phase 1. Notification records are NOT written when a comment is posted. This is deferred to Phase 2.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `briefId` | String | FK → `Brief.id`, cascade delete |
| `shareTokenId` | String | FK → `BriefShareToken.id`. Required — every comment must trace back to a share token. |
| `authorName` | String | Free text, required. Max 100 chars. |
| `authorEmail` | String? | Optional free text. Validated as email format at API layer if provided. Not a FK. |
| `body` | String | The comment text. Min 1 char. |
| `resolved` | Boolean | Default false. |
| `resolvedAt` | DateTime? | Null = open. Set by PM to mark addressed. |
| `resolvedById` | String? | FK → `User.id`, nullable. The PM who resolved it. |
| `createdAt` | DateTime | auto |

Constraints:
- `@@index([briefId])`
- `@@index([shareTokenId])`

### 3. TicketAttachment

Purpose: Files uploaded directly to a ticket at submission time. Separate from `BriefAttachment` because ticket attachments are scoped to the ticket's team, may be uploaded by non-PM roles, and have their own lifecycle.

**Confirmed:** Max 10 files per ticket. All attached files are fed into AI sizing automatically — no per-file toggle.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `ticketId` | String | FK → `Ticket.id`, cascade delete |
| `fileName` | String | Original filename as uploaded |
| `mimeType` | String | e.g. `application/pdf`, `image/png` |
| `sizeBytes` | Int | Validated: max 25 MB (26,214,400 bytes) at API layer |
| `storedPath` | String | Server-only: `./uploads/tickets/[ticketId]/[filename-with-suffix]`. Never returned to client. |
| `uploadedById` | String | FK → `User.id`. Required — all ticket uploads must be attributed to a logged-in user. |
| `createdAt` | DateTime | auto |

Constraints:
- `@@index([ticketId])`

Permitted MIME types (enforced at API layer): `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/jpeg`, `image/png`, `image/gif`, `image/webp`.

API validation: reject upload if ticket already has 10 attachments. Return 422 with message "Ticket has reached the 10-file attachment limit."

### 4. GanttItem

Purpose: Represents a single bar (phase/task) in the project Gantt chart generated for an Epic. Each bar optionally links to a child ticket. Dates are stored explicitly and are user-editable — they are not derived at runtime from ticket data.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `epicId` | String | FK → `Epic.id`, cascade delete |
| `ticketId` | String? | FK → `Ticket.id`, set null on delete. Null = phase without a ticket (milestone row). |
| `title` | String | Display label for the bar |
| `team` | Team? | Which team owns this bar. Null = cross-team or unassigned. |
| `startDate` | DateTime | Bar start |
| `endDate` | DateTime | Bar end |
| `order` | Int | Display sort order within the Gantt |
| `color` | String | Hex color for the bar. Defaults to team color. |
| `aiGenerated` | Boolean | True if created by the AI generation step. False if manually added. |
| `slippedFromSprintId` | String? | FK → `Sprint.id`, set null on delete. Populated when a carryover event touches this bar. |
| `slippedAt` | DateTime? | Timestamp of the slip event. |
| `createdAt` | DateTime | auto |
| `updatedAt` | DateTime | auto |

Constraints:
- `@@index([epicId])`
- `@@index([ticketId])`

### 5. SprintCarryoverSuggestion

Purpose: Created automatically when a sprint is closed (`isActive` set to false) for each ticket in that sprint that is not in `DONE` status. Drives the carryover approval UI.

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | PK |
| `ticketId` | String | FK → `Ticket.id`, cascade delete |
| `fromSprintId` | String | FK → `Sprint.id`. The sprint that closed. Set null on delete. |
| `toSprintId` | String? | FK → `Sprint.id`. Set when PM accepts. Null = pending or dismissed. |
| `status` | Enum: `PENDING` / `ACCEPTED` / `DISMISSED` | Default `PENDING` |
| `resolvedByUserId` | String? | FK → `User.id`. Who accepted or dismissed. |
| `resolvedAt` | DateTime? | When it was resolved. |
| `createdAt` | DateTime | auto |
| `updatedAt` | DateTime | auto |

Constraints:
- `@@unique([ticketId, fromSprintId])` — one suggestion per ticket per sprint close event
- `@@index([fromSprintId])`
- `@@index([toSprintId])`
- `@@index([status])`

### Schema amendments to existing models

| Model | Field to add | Type | Reason |
|---|---|---|---|
| `BriefStatus` enum | `APPROVED` | enum value | Required for Phase 1 gating |
| `RoadmapItem` | `epicId` | `String?` `@unique`, FK → `Epic.id`, set null on delete | Tracks auto-created roadmap entries. `@unique` enforces one RoadmapItem per epic. |
| `RoadmapItem` | `titleManuallyEdited` | `Boolean @default(false)` | When true, `syncRoadmapItem` skips overwriting `title`. Set to true when PM edits the title directly. Epic name changes do NOT overwrite manual titles. |

---

## Phase 1: Brief Creation and Stakeholder Review

### What already exists

- `POST /api/briefs` creates a brief in `DRAFT` status.
- `PATCH /api/briefs/[id]` edits title and rawInput while in `DRAFT` or `REVIEW`.
- `GET /api/briefs/[id]` returns the brief with attachments and linked tickets.

### What to build

#### UI touchpoints

| Screen | Action |
|---|---|
| `/briefs/[id]` — Brief detail page | "Share with Stakeholders" button → opens a modal |
| Share modal | Displays the generated share URL. Button to copy. Optional label field (e.g. "Shared with Acme team"). No expiry option — tokens are permanent. Shows a list of existing tokens with revoke buttons. |
| `/briefs/share/[token]` — Public review page | Unauthenticated. Shows the **full brief** — all fields (title, objective, targetAudience, deliverables, dependencies, requiredTeams, timeline, successMetrics, clarifications). No internal fields (rawInput, storedPath). Comments panel on the right. |
| Public comments panel | Name field (required), email field (optional), comment body. Submit button. Lists existing comments (author name, timestamp). |
| `/briefs/[id]` — Brief detail page | "Comments" tab showing all `BriefComment` records with share token label. PM can mark each resolved. No in-app notifications — PM checks this tab manually. |
| `/briefs/[id]` — Brief detail page | "Approve Brief" button (ADMIN / TEAM_LEAD only). Sets `status = APPROVED`. |

#### API endpoints to build

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/briefs/[id]/share` | Session required | Creates a `BriefShareToken`. Returns `{ id, token, label, revoked, createdAt }`. Token generated with `crypto.randomBytes(32).toString('hex')`. |
| `GET` | `/api/briefs/[id]/share` | Session required | Lists all share tokens for the brief (`id`, `label`, `revoked`, `createdAt`, `commentCount`). |
| `PATCH` | `/api/briefs/[id]/share/[tokenId]` | Session required | Updates `label` or sets `revoked = true`. |
| `DELETE` | `/api/briefs/[id]/share/[tokenId]` | Session required | Deletes the token entirely. |
| `GET` | `/api/briefs/share/[token]` | No auth | Validates token (checks `revoked`). Returns full brief fields. Also returns comments for this brief. Returns `410` if revoked. |
| `POST` | `/api/briefs/share/[token]` | No auth | Creates a `BriefComment`. Body: `{ authorName, authorEmail?, body }`. Returns `410` if token revoked. |
| `GET` | `/api/briefs/[id]/comments` | Session required | Returns all `BriefComment` records for a brief with share token label and resolved status, ordered by `createdAt` asc. |
| `PATCH` | `/api/briefs/[id]/comments/[commentId]` | Session required | Marks comment resolved or unresolved. Sets `resolvedAt`, `resolvedById`, `resolved`. |
| `PATCH` | `/api/briefs/[id]/approve` | ADMIN or TEAM_LEAD | Sets `Brief.status = APPROVED`. Blocked if current status is not `REVIEW` or `DRAFT`. |

#### State machine addition

Current: `DRAFT` → `GENERATING` → `REVIEW` → `FINALIZED` → `ARCHIVED`
New state added: `REVIEW` → `APPROVED` → (proceeds to Phase 2)

`APPROVED` briefs are immutable: PATCH on the brief body is blocked. Only `epicId` linkage is still writable.

### Acceptance criteria

- [ ] PM can generate a share link from any brief in `DRAFT`, `REVIEW`, or `APPROVED` status
- [ ] Share link opens without login and shows brief content (no internal fields)
- [ ] Stakeholder can submit a comment; comment appears immediately on the public page and in the PM's comments tab
- [ ] PM can mark a comment as resolved
- [ ] PM can revoke a share token; revoked tokens return 410 Gone
- [ ] "Approve Brief" button only appears to ADMIN / TEAM_LEAD
- [ ] Approved briefs are read-only in the brief editor

---

## Phase 2: Brief-to-Ticket Submission

### Dependencies

Phase 1 must be complete. The brief must be in `APPROVED` status.

### What already exists

- `Ticket` model has `briefId` FK. Brief-to-ticket linkage is possible.
- `AIEstimate` model exists for per-ticket size suggestions.
- `BriefAttachment` handles brief-level uploads.

### What to build

#### UI touchpoints

| Screen | Action |
|---|---|
| Ticket creation form | New field: "Link to Brief" — searchable dropdown of the user's APPROVED briefs. Optional. |
| Ticket creation form | "Attach files" section — multi-file upload (PDF, DOCX, images). Separate from the brief's own attachments. |
| Ticket creation form | After brief is selected and form submitted, AI sizing panel appears (or runs automatically). |
| AI sizing panel | Shows `AIEstimate.suggestedSize`, `rationale`, `confidence` (as a percentage). PM can accept or override. Size selector remains editable. |

#### API endpoints to build

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/tickets/[id]/attachments` | Session required | Multipart upload. Creates `TicketAttachment` records. Max 5 files per request, 25 MB each. |
| `GET` | `/api/tickets/[id]/attachments` | Session required | Lists attachments for a ticket (no `storedPath` returned). |
| `DELETE` | `/api/tickets/[id]/attachments/[attachmentId]` | Session required | Deletes file from disk and DB. Creator or ADMIN only. |
| `POST` | `/api/tickets/[id]/ai-size` | Session required | Runs AI sizing. Reads `Brief` content + `TicketAttachment` file text. Creates `AIEstimate`. Returns estimate. |

#### AI sizing logic

Inputs to the AI prompt:
- `Brief.objective`, `Brief.deliverables`, `Brief.timeline`, `Brief.requiredTeams`
- `Brief.extractedText` if present
- Extracted text from any `TicketAttachment` files (PDF/DOCX text extraction, image OCR not required in Phase 1)
- `Ticket.title`, `Ticket.description`, `Ticket.team`

Output stored in `AIEstimate`:
- `suggestedSize` (one of `XS/S/M/L/XL/XXL`)
- `confidence` (Float 0.0–1.0)
- `rationale` (plain English paragraph)
- `flags` (JSON array — e.g. `["timeline unclear", "deliverables vague"]`)

PM action:
- Accept: sets `AIEstimate.accepted = true`, `acceptedBy = userId`, `acceptedAt = now()`, and sets `Ticket.size = suggestedSize`
- Override: sets `Ticket.size` to the chosen value. `AIEstimate.accepted` stays false.

### Acceptance criteria

- [ ] Ticket creation form shows approved briefs in the "Link to Brief" dropdown
- [ ] Files can be attached to a ticket before or after creation
- [ ] Unsupported MIME types are rejected with a clear error message
- [ ] After brief is linked, AI sizing runs and renders the panel within the ticket form
- [ ] PM can accept or override the suggested size before saving the ticket
- [ ] `AIEstimate` record is created regardless of whether PM accepts or overrides

---

## Phase 3: Multi-Team Splitting and Epic Creation

### Dependencies

Phase 1 must be complete. The brief must be in `APPROVED` status.

**Confirmed: No parent ticket.** The Brief is the source document. AI creates an Epic and child tickets (one per team) directly from the Brief. There is no "original ticket" to mark Done or Cancelled. The workflow is:

```
Approved Brief → AI proposes team split → PM reviews → Confirm → Epic + child tickets created
```

All child tickets link to the Brief via `briefId`. The Brief links to the Epic via `Brief.epicId`.

### What already exists

- `Epic` model exists. `Ticket.epicId` FK exists. `Ticket.briefId` FK exists.
- `TicketDependency` model exists with `BLOCKS` / `BLOCKED_BY` types and `detectedBy = AI`.

### What to build

#### UI touchpoints

| Screen | Action |
|---|---|
| Brief detail page (`/briefs/[id]`) | "Scope into Teams" button (ADMIN / TEAM_LEAD only). Visible when brief is in `APPROVED` status. |
| Team split review modal | Shows the AI-proposed breakdown: one row per team with suggested ticket title, size, and assigned team. Shows proposed dependency order as a numbered list. |
| Team split review modal | PM can: edit ticket titles, change sizes, remove a team row, add a team row, reorder dependencies. |
| Team split review modal | "Confirm and Create Epic" button. Creates the epic, child tickets, and dependencies in a single transaction. |

#### API endpoints to build

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/briefs/[id]/suggest-split` | ADMIN or TEAM_LEAD | Calls AI using the brief content. Returns proposed split as JSON. Does NOT write to DB. |
| `POST` | `/api/briefs/[id]/confirm-split` | ADMIN or TEAM_LEAD | Accepts the (possibly PM-edited) split payload. Writes Epic, child Tickets, and TicketDependency records in a transaction. Returns `{ epicId, tickets[], dependencies[] }`. |

#### AI split logic

Inputs to the AI prompt:
- `Brief` fields: `objective`, `deliverables`, `requiredTeams`, `timeline`, `successMetrics`, `extractedText`
- The full list of available teams (CONTENT, DESIGN, SEO, WEM, PAID_MEDIA, ANALYTICS)

Output (not persisted yet — returned to client for PM review):

```
{
  teams: [
    {
      team: "SEO",
      title: "SEO keyword research and tagging",
      size: "M",
      order: 1
    },
    {
      team: "CONTENT",
      title: "Write long-form article",
      size: "L",
      order: 2,
      dependsOnOrder: [1]
    },
    {
      team: "DESIGN",
      title: "Page layout and image production",
      size: "M",
      order: 3,
      dependsOnOrder: [2]
    },
    {
      team: "WEM",
      title: "CMS publishing and QA",
      size: "S",
      order: 4,
      dependsOnOrder: [3]
    }
  ],
  reasoning: "..."
}
```

Single-team result: `teams` array has one entry. No epic is created. A single ticket is created directly from the brief.

#### Confirm-split transaction (written to DB)

1. Create `Epic` with `status = IN_PLANNING`, `name = Brief.title`. Update `Brief.epicId` to link the brief to the new epic.
2. For each team in the split: create a `Ticket` with `epicId`, `briefId`, `team`, `size`, `status = BACKLOG`.
3. For each dependency in the split: create two `TicketDependency` records per pair — one `BLOCKS` and one `BLOCKED_BY` — with `detectedBy = AI`.
4. No parent ticket exists — nothing is marked Done or Cancelled. The Brief itself is the audit record.

### Acceptance criteria

- [ ] "Scope into Teams" button only appears on briefs in `APPROVED` status
- [ ] AI returns a team split with dependency order derived from brief content
- [ ] PM can edit all fields in the review modal before confirming
- [ ] Single-team result skips epic creation and creates one ticket directly from the brief
- [ ] Multi-team result creates an epic and all child tickets in one atomic transaction
- [ ] `TicketDependency` records are created with `detectedBy = AI`
- [ ] `Brief.epicId` is updated to point to the newly created epic

---

## Phase 4: AI-Generated Gantt Chart

### Dependencies

Phase 3 must be complete. An `Epic` must exist with at least two child tickets.

### What already exists

- `Epic` model has `startDate` and `endDate`.
- `Ticket` model has `size` and `dueDate`.
- `TicketDependency` provides the dependency graph.

### What to build

#### UI touchpoints

| Screen | Action |
|---|---|
| `/epics/[id]` — Epic detail page | New "Project Plan" tab next to the existing tickets list. |
| Project Plan tab | Gantt chart rendered as horizontal bars. One bar per `GanttItem`. Rows grouped by `GanttItem.team`. |
| Gantt bar | Drag left/right edge to change `startDate`/`endDate`. Drag body to shift the entire bar. |
| Gantt bar | Click to open an inline editor: title, assignee, color, link/unlink ticket. |
| Gantt toolbar | "Add row" button. "Regenerate" button (re-runs AI, warns that manual edits will be overwritten). |
| Gantt slip indicator | Bars with `slippedFromSprintId` set show a red hatch or striped overlay with a tooltip: "Slipped from [sprint name]". |
| Below Gantt | All child tickets listed in a table (title, team, size, status, assignee). Same as the existing tickets tab but filtered to the epic. |

#### API endpoints to build

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/epics/[id]/gantt/generate` | ADMIN or TEAM_LEAD | Calls AI to produce `GanttItem` records from the epic's child tickets and their dependencies. Deletes and recreates all `aiGenerated = true` items. Leaves manually created items. |
| `GET` | `/api/epics/[id]/gantt` | Session required | Returns all `GanttItem` records for the epic, ordered by `order`. |
| `POST` | `/api/epics/[id]/gantt` | Session required | Creates a manual `GanttItem`. |
| `PATCH` | `/api/gantt-items/[id]` | Session required | Updates `startDate`, `endDate`, `title`, `order`, `color`, `team`, `ticketId`. |
| `DELETE` | `/api/gantt-items/[id]` | ADMIN or TEAM_LEAD | Deletes a single `GanttItem`. |

#### AI Gantt generation logic

Inputs:
- `Epic.startDate` (required before generation; if null, default to today's date and warn PM)
- All child `Ticket` records with `size` and `team`
- All `TicketDependency` records between those tickets (to determine order)

The AI resolves the dependency graph topologically and assigns:
- `startDate` = predecessor's `endDate` (or `Epic.startDate` for tickets with no predecessors)
- `endDate` = `startDate` + hours-equivalent of `TicketSize` (using the size hour map: XS=2, S=4, M=8, L=20, XL=36, XXL=72), scaled to working days (8 hours/day, Mon–Fri)

Output: one `GanttItem` per child ticket. Stored with `aiGenerated = true`.

After generation: `Epic.endDate` is updated to the latest `GanttItem.endDate` across all items.

#### Date calculation reference (for backend, no external calendar library needed)

```
function addWorkingHours(startDate: Date, hours: number): Date
```

Implementation: iterate days, skip Saturday (day 6) and Sunday (day 0), accumulate 8 hours per working day. No public holiday awareness in Phase 1.

### Acceptance criteria

- [ ] "Project Plan" tab appears on epic detail page after epic is created via the split workflow
- [ ] "Generate Plan" button runs AI generation and renders bars
- [ ] Each bar reflects the correct ticket's title, team color, and size-based duration
- [ ] Bars are horizontally draggable to adjust dates
- [ ] Manual edits persist after a page reload
- [ ] "Regenerate" shows a warning modal before overwriting AI-generated bars
- [ ] Manually created bars (non-AI) are never overwritten by regeneration
- [ ] `Epic.endDate` is updated after generation completes

---

## Phase 5: Roadmap Integration

### Dependencies

Phase 4 must be complete. `Epic.endDate` must be set (either by AI Gantt generation or manual PATCH).

### What already exists

- `RoadmapItem` model exists with `period` (ISO month), `title`, `initiative`, `status`, `startDate`, `endDate`.
- `POST /api/roadmap-items` creates items manually.
- `RoadmapItemStatus` enum: `NOT_STARTED`, `IN_PROGRESS`, `DONE`, `CARRIED_OVER`, `NOT_COMMITTED`, `CANCELLED`.

### What to build

#### Trigger

Auto-creation fires when `Epic.endDate` transitions from null to a non-null value. This happens via:
- The Gantt generation completing (Phase 4)
- A manual PATCH to `PATCH /api/epics/[id]` that sets `endDate`

The trigger is implemented as a helper function called inside both write paths — not a DB trigger.

#### Mapping

| `Epic` field | `RoadmapItem` field | Mapping |
|---|---|---|
| `name` | `title` | Direct copy |
| `name` | `initiative` | Direct copy |
| `endDate` | `period` | `YYYY-MM` of the `endDate` |
| `startDate` | `startDate` | Direct copy |
| `endDate` | `endDate` | Direct copy |
| `status` | `status` | See table below |
| `id` | `epicId` | New FK (requires schema addition) |

#### EpicStatus → RoadmapItemStatus mapping

| EpicStatus | RoadmapItemStatus |
|---|---|
| `INTAKE` | `NOT_STARTED` |
| `IN_BRIEF` | `NOT_STARTED` |
| `BRIEFED` | `NOT_STARTED` |
| `IN_PLANNING` | `NOT_STARTED` |
| `IN_PROGRESS` | `IN_PROGRESS` |
| `DONE` | `DONE` |
| `ON_HOLD` | `NOT_COMMITTED` |
| `CANCELLED` | `CANCELLED` |

#### Sync behavior

- First time `Epic.endDate` is set: create a new `RoadmapItem` linked via `epicId`.
- Subsequent updates to `Epic.endDate`, `Epic.name`, or `Epic.status`: update the linked `RoadmapItem` in place.
- **Manual roadmap title edits win:** If the PM directly edits `RoadmapItem.title` via `PATCH /api/roadmap-items/[id]`, set `titleManuallyEdited = true`. The `syncRoadmapItem` helper checks this flag and skips overwriting `title` when it is `true`. `initiative` is still synced from the epic regardless.
- All other fields (`tier`, `category`, `region`, `notes`) are never overwritten by sync — they are PM-managed only.
- The synced fields are: `period` (from `endDate`), `status` (mapped from `EpicStatus`), `startDate`, `endDate`, and `title`/`initiative` (only when `titleManuallyEdited = false`).
- If `Epic.endDate` is set back to null: the `RoadmapItem` is NOT deleted. It is set to `NOT_COMMITTED` status. The PM must delete it manually.

#### API changes required

- `PATCH /api/epics/[id]`: after updating the epic, call `syncRoadmapItem(epicId)` if `endDate` or `status` changed.
- `GET /api/roadmap-items`: add optional `epicId` filter param.

### Acceptance criteria

- [ ] Setting `Epic.endDate` for the first time creates a `RoadmapItem` automatically
- [ ] The roadmap item appears in the correct month column based on `endDate`
- [ ] Updating `Epic.status` or `Epic.endDate` updates the roadmap item
- [ ] Manual roadmap item edits (notes, tier, category) are not overwritten by epic sync
- [ ] Setting `Epic.endDate` back to null sets roadmap item to `NOT_COMMITTED`, does not delete it
- [ ] `GET /api/roadmap-items?epicId=[id]` returns the linked item

---

## Phase 6: Sprint Carryover Approval

### Dependencies

Sprint management must be operational. The `Sprint` model and sprint-closing flow must exist.

### What already exists

- `Sprint` model has `isActive` Boolean. Setting `isActive = false` currently has no side effects.
- `Ticket.sprintId` FK exists.
- `TicketStatus` enum has `DONE`.

### What to build

#### Trigger

When `PATCH /api/sprints/[id]` sets `isActive = false`:
1. Find all tickets with `sprintId = closedSprintId` AND `status != DONE`.
2. For each: create a `SprintCarryoverSuggestion` with `status = PENDING`, `fromSprintId = closedSprintId`.
3. Do NOT move tickets yet. Do NOT update `Ticket.sprintId`.

#### UI touchpoints

| Screen | Action |
|---|---|
| Next active sprint page | Banner at top: "X tickets from [Sprint Name] need sprint assignment." Link to carryover modal. Only visible to ADMIN or TEAM_LEAD. |
| Carryover modal | Table: ticket title, team, size, current status. For each row: sprint selector dropdown (active + future sprints only) or "Move to Backlog". Accept / Dismiss buttons per row. |
| Gantt chart (epic detail) | Bars with `slippedFromSprintId` set show a slip indicator. Dates are NOT auto-updated. A "Suggested shift: +N days" badge appears on each slipped bar. |
| Gantt slip badge | PM clicks badge → modal showing the suggested shift. "Accept shift" button updates `GanttItem.startDate` and `GanttItem.endDate` by the slip delta. "Dismiss" closes without updating. |

#### API endpoints to build

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/sprints/[id]/carryover` | ADMIN or TEAM_LEAD | Returns all `PENDING` `SprintCarryoverSuggestion` records for the sprint, with ticket details. |
| `PATCH` | `/api/sprint-carryover/[id]/accept` | ADMIN or TEAM_LEAD | Sets `toSprintId`, `status = ACCEPTED`, `resolvedByUserId`, `resolvedAt`. Updates `Ticket.sprintId`. |
| `PATCH` | `/api/sprint-carryover/[id]/dismiss` | ADMIN or TEAM_LEAD | Sets `status = DISMISSED`, clears `toSprintId`, sets `resolvedAt`. Sets `Ticket.sprintId = null` (moves ticket to backlog). Historical context is preserved in `TicketStatusHistory`. |
| `PATCH` | `/api/gantt-items/[id]/accept-slip` | ADMIN or TEAM_LEAD | Applies the slip delta. Updates `GanttItem.startDate` and `endDate`. Also updates `Epic.endDate` if this was the last bar. |

#### Gantt slip delta calculation

When a ticket carries over from Sprint A to Sprint B:
- Slip delta = `Sprint B startDate` − `Sprint A endDate` (in days)
- Set `GanttItem.slippedFromSprintId = Sprint A id`
- Set `GanttItem.slippedAt = now()`
- Do NOT modify `GanttItem.startDate` or `endDate` until PM accepts the shift

#### No cascading date shifts

When PM accepts a shift on one `GanttItem`, only that item's dates change. Downstream bars are NOT automatically shifted. PM must accept each bar individually. This is intentional — prevents uncontrolled cascades and forces the PM to make explicit decisions about downstream impacts.

### Acceptance criteria

- [ ] Closing a sprint with incomplete tickets creates one `SprintCarryoverSuggestion` per ticket
- [ ] ADMIN / TEAM_LEAD sees a banner on the next sprint page
- [ ] PM can accept (assign to sprint) or dismiss each suggestion independently
- [ ] Accepting updates `Ticket.sprintId` to the chosen sprint
- [ ] Dismissed tickets remain in backlog (no sprint assignment)
- [ ] Gantt bars for carried-over tickets show a visual slip indicator
- [ ] PM can accept or dismiss suggested date shifts on each Gantt bar independently
- [ ] Accepting a shift on the last bar in an epic updates `Epic.endDate`

---

## User Stories

- As a PM, I can share a brief with external stakeholders via a time-limited link so that they can review and comment without needing an account.
- As a stakeholder, I can leave feedback on a brief using only my name and email so that the PM can see my comments without requiring me to log in.
- As a PM, I can approve a brief to signal that it is ready for scoping so that the team does not start work on unapproved content.
- As a PM, I can attach supporting files directly to a ticket so that the delivery team has all context in one place.
- As a PM, I can get an AI-suggested ticket size based on the brief content so that sizing is consistent and reasoned.
- As a PM, I can review and override the AI's team split proposal before any tickets are created so that I retain control of how work is divided.
- As a PM, I can view a Gantt chart generated from the epic's child tickets so that I have an immediate visual project plan.
- As a PM, I can edit Gantt bars directly in the UI so that I can adjust the plan without going through a separate scheduling tool.
- As a PM, I can see when a sprint closes and assign incomplete tickets to future sprints so that nothing falls through the cracks.
- As a PM, I can accept or dismiss suggested Gantt date shifts after a slip so that the project plan stays accurate.

---

## Build Order

| Step | Specialist | Task |
|---|---|---|
| 1 | DB Engineer | Add `APPROVED` to `BriefStatus` enum. Add `epicId` FK to `RoadmapItem`. Add `BriefShareToken`, `BriefComment`, `TicketAttachment`, `GanttItem`, `SprintCarryoverSuggestion` models. Run migration. |
| 2 | Backend Engineer | Build Phase 1 share token and comment API routes. |
| 3 | Frontend Engineer | Build the share modal and the public `/briefs/share/[token]` page with comment panel. |
| 4 | Backend Engineer | Build Phase 2 ticket attachment upload and AI sizing endpoints. |
| 5 | Frontend Engineer | Add brief selector and file upload to ticket creation form. Add AI sizing panel. |
| 6 | Backend Engineer | Build Phase 3 suggest-split and confirm-split endpoints. |
| 7 | Frontend Engineer | Build the team split review modal. |
| 8 | Backend Engineer | Build Phase 4 Gantt generation and CRUD endpoints. Add `syncRoadmapItem` helper. Instrument Phase 5 trigger in epic PATCH. |
| 9 | Frontend Engineer | Build the Gantt chart component on the epic detail page. Drag-and-drop bar editing. |
| 10 | Backend Engineer | Build Phase 6 carryover trigger in sprint close PATCH. Build carryover resolution endpoints. |
| 11 | Frontend Engineer | Build carryover banner, modal, and Gantt slip indicator with accept/dismiss controls. |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Share token is revoked | Return `410 Gone` with message "This review link has been revoked." Tokens do not expire — revocation is the only way to invalidate. |
| Share token is revoked while a stakeholder has it open | Next API call returns `410 Gone`. Comments already submitted are preserved. |
| PM approves a brief that has no comments | Allowed. Comments are optional. |
| AI sizing is called on a ticket with no brief | AI still runs using only `Ticket.title` and `Ticket.description`. Lower confidence expected. |
| Ticket attachment upload fails mid-multi-upload | Files successfully uploaded remain. Partial success response lists which files succeeded and which failed. |
| AI returns a single-team split | No epic created. Original ticket is updated with size. Phase 3 confirm-split returns `{ epicId: null, ticket }`. |
| Epic has no `startDate` when Gantt generation is called | Default to current date. Return a warning in the response body. |
| PM regenerates Gantt after manual edits | Warning modal shown. Only `aiGenerated = true` items are deleted and recreated. Manual items are untouched. |
| `Epic.endDate` is set to null after roadmap item exists | Roadmap item status set to `NOT_COMMITTED`. Item is NOT deleted. |
| Two `TicketDependency` records create a circular dependency | Validated at the confirm-split endpoint. If the AI produces a cycle, reject the payload with a `400` explaining the cycle. |
| Sprint closes with zero incomplete tickets | No `SprintCarryoverSuggestion` records created. No banner shown. |
| PM dismisses a carryover and then wants to undo | No undo in Phase 1. Dismissal sets `Ticket.sprintId = null` (backlog). PM must manually assign the ticket to a sprint. `TicketStatusHistory` preserves context. Log this as a known limitation. |
| Carryover ticket is linked to an epic with a Gantt | `GanttItem.slippedFromSprintId` and `slippedAt` are set. Dates are not auto-shifted. |
| Multiple sprint closes before PM reviews carryover | Each close event appends new `PENDING` suggestions. The banner count reflects all unresolved suggestions across all previous sprints. |

---

## Out of Scope (Phase 1)

- Email notifications to stakeholders when a brief is shared (Phase 2 — requires email transport config)
- Image OCR for ticket attachments (Phase 2 — text extraction from PDFs and DOCX only in Phase 1)
- Public holiday awareness in Gantt date calculations (Phase 2)
- Cascading Gantt date shifts when a downstream bar is accepted (intentionally deferred — PM decides each bar explicitly)
- Version history for brief content (Phase 2)
- Stakeholder identity verification (tokens are share-by-link only — no email confirmation of commenter identity)
- Bulk accept/dismiss for carryover suggestions (Phase 2)
- Epic-to-epic dependencies on the Gantt or roadmap (Phase 2)
- Gantt export to PDF or image (Phase 2)

---

## Open Questions for PM

All original questions have been answered. Decisions are recorded below and reflected throughout the spec.

| # | Phase | Question | Decision |
|---|---|---|---|
| 1 | Phase 1 | What is the default share token expiry? | **Never expires.** No `expiresAt` field. Tokens are permanent; PM revokes manually. Share link also stored on Ticket (via Brief) for delivery reference. |
| 2 | Phase 1 | Should the share page show the full brief or a curated subset? | **Full brief** — all fields except internal ones (`rawInput`, `storedPath`). |
| 3 | Phase 1 | Should PMs be notified (in-app) when a new stakeholder comment is posted? | **No in-app notifications in Phase 1.** Deferred to Phase 2. |
| 4 | Phase 2 | Maximum number of attachments per ticket? | **10 files max per ticket.** API returns 422 if exceeded. |
| 5 | Phase 2 | Should ticket attachments be fed into AI sizing automatically or toggled per file? | **All attached files feed into AI sizing automatically.** No per-file toggle. |
| 6 | Phase 3 | Should the original "parent" ticket be set to DONE or CANCELLED? | **No parent ticket.** Brief is the source document. AI creates Epic + child tickets directly from the Brief. No ticket to mark Done or Cancelled. |
| 7 | Phase 4 | Block Gantt generation if `Epic.startDate` is null, or default to today? | **Default to today with a warning.** Return `{ warning: "Epic has no start date — defaulted to today." }` in the response body. |
| 8 | Phase 4 | Are weekends excluded from Gantt duration calculation? | **Yes — 8-hour Mon–Fri working days. Weekends excluded.** No public holiday awareness in Phase 1. |
| 9 | Phase 5 | If a PM manually changes `RoadmapItem.title`, should epic name changes overwrite it? | **Manual roadmap edits win.** `RoadmapItem.titleManuallyEdited` flag added. `syncRoadmapItem` skips `title` when this flag is `true`. |
| 10 | Phase 6 | After a carryover is dismissed, set `sprintId = null` or leave pointing at closed sprint? | **Set `Ticket.sprintId = null` (move to backlog).** Historical context preserved in `TicketStatusHistory`. |

---

## Architect's Notes

**BriefStatus enum migration**: SQLite does not support ALTER COLUMN for enum changes. Adding `APPROVED` requires a new migration that recreates the table or uses a string column workaround. The DB Engineer must handle this carefully — existing `FINALIZED` briefs must not be affected.

**RoadmapItem epicId uniqueness**: Consider adding `@@unique([epicId])` to `RoadmapItem` to prevent duplicate roadmap entries per epic. The sync helper should upsert on this key rather than always creating. Add this to the DB Engineer's migration task.

**Gantt drag-and-drop**: No third-party Gantt library should be introduced. Build the bars as absolutely positioned `div` elements within a scrollable container using `startDate`/`endDate` offsets. This keeps the bundle size local and avoids licensing issues.

**Token security**: `BriefShareToken.token` must be generated with `crypto.randomBytes(32).toString('hex')` — 256-bit entropy. Do not use `cuid()` or `Math.random()`. The token must be stored as-is (not hashed) because it is used as a lookup key in the unauthenticated route. Tokens never expire — revocation is via `revoked = true`. Rate-limit the `GET /api/briefs/share/[token]` endpoint at the Next.js middleware layer.

**RoadmapItem title sync**: The `syncRoadmapItem` helper must check `titleManuallyEdited` before overwriting `title`. Set `titleManuallyEdited = true` in the `PATCH /api/roadmap-items/[id]` handler when `title` is included in the request body. Never set it back to false automatically — only the PM can reset it via an explicit API field.

**Atomic confirm-split**: The Phase 3 confirm-split endpoint must use a Prisma `$transaction` wrapping all writes (epic, tickets, dependencies, original ticket status update). If any write fails, nothing is committed.

**Working day calculation**: Do not import a date library for working day math. A simple loop over days is sufficient given the small hour ranges involved (max XXL = 72 hours = 9 working days). Keep it in `src/lib/date-utils.ts`.

**Phase sequencing risk**: Phases 4 and 5 are tightly coupled — Gantt generation updates `Epic.endDate`, which triggers roadmap sync. Test these together. A failed roadmap sync must not roll back the Gantt generation. Use a try/catch in the roadmap sync call and log the error without failing the Gantt generation response.
