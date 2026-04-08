# Feature: Ticket Types

## Overview

Each ticket is assigned a type — Bug, Feature, Task, Story, or Improvement — to communicate intent at a glance and enable filtering. Type is stored as a new `TicketType` enum on the `Ticket` model. It is optional (null = legacy ticket, no type assigned). No admin configuration is required; all five types are always available to all teams. Types surface on kanban cards, the ticket detail panel, the create/edit form, and as a board filter.

---

## Data Model

### Schema changes

Add one enum and one optional field to `Ticket`. This is a non-breaking additive migration.

```prisma
enum TicketType {
  BUG
  FEATURE
  TASK
  STORY
  IMPROVEMENT
}

model Ticket {
  // ... existing fields ...
  ticketType  TicketType?  /// null = legacy ticket; no type assigned
}
```

The field is named `ticketType` (not `type`) to avoid colliding with the reserved keyword `type` in certain query contexts and to be unambiguous in audit log entries.

### Index

No index needed. Type is used for client-side filtering on the board after the column data is fetched; it is not a primary DB query filter.

### Migration notes

- Existing rows: `ticketType` defaults to `null`. No backfill required.
- The `TicketAuditLog` already tracks arbitrary field names as strings. When `ticketType` changes, the Backend Engineer records `field: "ticketType"` in the audit log.

---

## Type Metadata

Defined as a constant map in `src/lib/ticket-types.ts`. Not stored in the DB — these are display concerns only.

| Type | Lucide Icon | Color (Tailwind token) | Hex |
|---|---|---|---|
| BUG | `Bug` | `text-red-500` | `#ef4444` |
| FEATURE | `Sparkles` | `text-violet-500` | `#8b5cf6` |
| TASK | `CheckSquare` | `text-blue-500` | `#3b82f6` |
| STORY | `BookOpen` | `text-amber-500` | `#f59e0b` |
| IMPROVEMENT | `TrendingUp` | `text-emerald-500` | `#10b981` |

The `TICKET_TYPE_META` constant is:

```ts
export const TICKET_TYPE_META: Record<TicketType, {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  hex: string;
}> = { ... }
```

---

## User Stories

- As any user creating a ticket, I can select a type from a dropdown so that the ticket's intent is communicated immediately.
- As any user editing a ticket, I can change the type so that misclassified tickets are corrected without creating a new ticket.
- As any user viewing the kanban board, I can see the type badge on each card so that I can scan ticket intent across a sprint at a glance.
- As any user viewing the ticket detail panel, I can see the type badge prominently so that context is clear without reading the full description.
- As any user viewing the kanban board, I can filter columns by one or more types so that I can focus on bugs or features in isolation.
- As any user, I can leave `ticketType` unset so that legacy tickets and quickly-created tickets are not blocked by a required field.

---

## Acceptance Criteria

### Data layer

- [ ] `TicketType` enum exists in `schema.prisma` with values: `BUG | FEATURE | TASK | STORY | IMPROVEMENT`.
- [ ] `Ticket.ticketType` field is optional (`TicketType?`), defaults to `null`.
- [ ] `npx prisma migrate dev` runs cleanly with no data loss on an existing database.

### API

- [ ] `POST /api/tickets` accepts an optional `ticketType` field; stores it on the ticket.
- [ ] `PATCH /api/tickets/[id]` accepts an optional `ticketType` field; updates the ticket and writes a `TicketAuditLog` entry with `field: "ticketType"`.
- [ ] `GET /api/tickets` and `GET /api/tickets/[id]` include `ticketType` in the response payload.
- [ ] Passing an invalid enum value returns `400 { error: "Invalid ticketType" }`.

### Ticket type badge (`TicketTypeBadge`)

- [ ] Renders as an icon-only badge at small sizes (kanban card).
- [ ] On hover, shows a tooltip with the full type label (e.g., "Bug").
- [ ] Accepts a `showLabel` prop — when true, renders icon + label side by side (used on ticket detail).
- [ ] When `ticketType` is `null`, the badge is not rendered (no empty placeholder).
- [ ] Icon and color match the `TICKET_TYPE_META` constants exactly.

### Ticket create/edit form

- [ ] A "Type" select field appears after the "Title" field and before "Description".
- [ ] Options are the five enum values rendered with icon + label.
- [ ] Default selection is blank (no type). The field is not required.
- [ ] Changing the type in edit mode calls `PATCH /api/tickets/[id]` immediately (same pattern as inline status/priority edits).

### Kanban board card

- [ ] `TicketTypeBadge` (icon-only) is rendered in the top-right area of the card, next to the priority indicator.
- [ ] Badge is only rendered when `ticketType` is non-null.

### Ticket detail panel

- [ ] `TicketTypeBadge` (icon + label) renders in the metadata section alongside team, status, size, and priority.
- [ ] Clicking the badge opens the type selector inline (same edit-in-place pattern as other metadata fields).

### Board filter

- [ ] A "Type" multi-select filter chip appears in the board filter bar alongside existing filters (team, sprint, label, etc.).
- [ ] Filtering by one or more types hides cards whose `ticketType` does not match.
- [ ] "No type" is a selectable filter option that shows only tickets where `ticketType` is `null`.
- [ ] Filter state is local to the component (not persisted to URL or DB in Phase 1).

---

## API Contract

### `POST /api/tickets`

Added field:
```ts
ticketType?: "BUG" | "FEATURE" | "TASK" | "STORY" | "IMPROVEMENT";
```

### `PATCH /api/tickets/[id]`

Added field (same type as above). When `ticketType` changes, write to `TicketAuditLog`:
```ts
{ field: "ticketType", oldValue: prevType ?? "null", newValue: nextType ?? "null" }
```

### `GET /api/tickets` and `GET /api/tickets/[id]`

Include `ticketType: TicketType | null` in the response object.

---

## Component List

| Component | File | Notes |
|---|---|---|
| `TicketTypeBadge` | `src/components/tickets/TicketTypeBadge.tsx` | Icon + optional label. Tooltip on hover. Null-safe (renders nothing when type is null). |
| `TicketTypeSelect` | `src/components/tickets/TicketTypeSelect.tsx` | Controlled select using shadcn `Select`. Used in create form and inline edit. |
| `TICKET_TYPE_META` | `src/lib/ticket-types.ts` | Static constant map. Single source of truth for icon, color, and label per type. |

Both components are under 80 lines. `TicketTypeSelect` is reused by the create form, the detail panel inline edit, and any future ticket table row edit.

---

## Build Order

1. Database Engineer: add `TicketType` enum and `Ticket.ticketType` field to `schema.prisma`, run `npx prisma migrate dev`.
2. Backend Engineer: update `POST /api/tickets` and `PATCH /api/tickets/[id]` to accept and store `ticketType`; add audit log write on change; update GET responses to include the field.
3. Frontend Engineer: create `src/lib/ticket-types.ts` with `TICKET_TYPE_META`.
4. Frontend Engineer: build `TicketTypeBadge` and `TicketTypeSelect`.
5. Frontend Engineer: add "Type" field to the ticket create/edit form using `TicketTypeSelect`.
6. Frontend Engineer: add `TicketTypeBadge` to the kanban card and ticket detail panel.
7. Frontend Engineer: add "Type" multi-select filter to the board filter bar.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Ticket created without `ticketType` | Field stores `null`. Badge is not rendered. "No type" filter option matches this ticket. |
| `PATCH` sets `ticketType` to `null` explicitly | Allowed. Clears the type. Audit log records `newValue: "null"`. |
| Invalid enum string sent to API | Returns `400 { error: "Invalid ticketType" }`. Never reaches the DB. |
| Filter selects both a type and "No type" | Both conditions are OR'd. Cards matching either condition are shown. |
| Legacy tickets (created before migration) | `ticketType` is `null`. They behave identically to tickets where type was explicitly cleared. |
| Two users edit type concurrently | Last write wins. No optimistic locking in Phase 1. Standard `updatedAt` timestamp tracks the latest change. |
| Audit log on type change from null to BUG | `oldValue: "null"`, `newValue: "BUG"`. String "null" (not SQL NULL) is used for readability in the audit log. |

---

## Out of Scope (Phase 1)

- Per-team default type (e.g., Design team defaults new tickets to TASK)
- Type-based SLA or due-date rules
- Custom types configured by an admin
- Type usage analytics or charts
- Filtering the ticket list/table view by type (add in the same pass as table filter parity work)
- Restricting which types are available per team

---

## Architect's Notes

The field is named `ticketType` rather than `type` to sidestep the TypeScript reserved word and to be explicit in audit log entries. The `TICKET_TYPE_META` constant lives in `src/lib/` rather than a component file so it can be imported by API-layer validators without pulling in React dependencies.

The board filter is client-side only in Phase 1. The ticket data is already loaded per-column; filtering does not require a new API call. This keeps implementation fast and avoids adding query params to an endpoint that is already shared across views.

Do not add a `@default` on the Prisma field. Defaulting to `null` is implicit for optional fields and avoids any ambiguity about whether a backfill is needed.
