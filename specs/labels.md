# Feature: Reusable Labels

## Overview

Labels become a first-class managed entity. Admins create, rename, recolor, and delete labels from a dedicated admin page. Tickets receive multiple labels via a many-to-many join. Labels render as colored chips on ticket cards, the ticket detail view, and in list/table views. The `Label` model and the implicit join table `_TicketLabels` already exist in the Prisma schema — no new model is needed. This spec covers the admin UI, the picker component, and the API routes that were absent from the original schema definition.

---

## Data Model

The schema already contains the full model. Shown here for reference and to make field names explicit.

```prisma
model Label {
  id      String   @id @default(cuid())
  name    String   @unique
  color   String   @default("#6b7280")
  tickets Ticket[] @relation("TicketLabels")
}
```

The `Ticket` model already has:
```prisma
labels  Label[]  @relation("TicketLabels")
```

Prisma manages the implicit join table `_TicketLabels` automatically. No migration is required to add the relation — it was already declared. A migration IS required if the `Label` table was never created by a prior `prisma migrate dev` run. The Database Engineer must verify whether the `Label` table exists in `dev.db` before calling this done.

### Schema changes

None. The `Label` model and the `Ticket.labels` relation are already present in `schema.prisma`.

---

## User Stories

- As an Admin, I can navigate to `/admin/labels` to see all labels so that I have a single place to manage the label library.
- As an Admin, I can create a new label with a name and hex color so that teams have a shared vocabulary for tagging tickets.
- As an Admin, I can rename an existing label so that outdated terminology is corrected everywhere it is used (labels are referenced by ID, so renaming propagates automatically).
- As an Admin, I can change the color of a label so that visual differentiation stays meaningful as the label library grows.
- As an Admin, I can delete a label so that stale labels no longer appear on the picker. Deletion removes the label from all tickets that hold it.
- As any authenticated user, I can add one or more labels to a ticket from the ticket detail view so that tickets are categorized.
- As any authenticated user, I can remove a label from a ticket so that incorrect tags are corrected.
- As any authenticated user, I can create a new label inline from the ticket label picker so that I do not need to leave the ticket to add a new label.
- As any user viewing a ticket card or list row, I can see the ticket's labels as colored chips so that I can scan categorization at a glance.

---

## Acceptance Criteria

### Admin page (`/admin/labels`)

- [ ] Page is accessible only to users with `role = ADMIN`. Non-admins receive a 403 redirect.
- [ ] The page lists all labels in a table with columns: Color swatch | Name | Tickets using this label (count) | Actions.
- [ ] Each row has an inline Edit button that enables editing the name and color in place (not a modal).
- [ ] Name field validates: non-empty, max 50 characters, unique across all labels (case-insensitive check at the API layer).
- [ ] Color field is a text input accepting a hex string (`#rrggbb`). A color picker (`<input type="color">`) is displayed alongside it.
- [ ] Saving an edit calls `PATCH /api/labels/[id]`. Success refreshes the row.
- [ ] Each row has a Delete button. Clicking it shows an inline confirmation ("Delete label? This will remove it from all tickets.") before calling `DELETE /api/labels/[id]`.
- [ ] A "New label" form at the top of the page allows creating a label with name + color. Submits to `POST /api/labels`.
- [ ] After create/delete, the full list re-fetches to reflect counts accurately.

### Ticket label picker

- [ ] The picker is rendered on the ticket detail view (full-page or slide-over panel).
- [ ] The picker shows a searchable dropdown of all existing labels with a color swatch and name per option.
- [ ] Labels already applied to the ticket are shown as checked / highlighted.
- [ ] Selecting a label calls `POST /api/tickets/[id]/labels` with `{ labelId }`.
- [ ] Deselecting a label calls `DELETE /api/tickets/[id]/labels/[labelId]`.
- [ ] The picker includes a "Create new label" action at the bottom of the dropdown. Clicking it shows an inline mini-form (name + color) that calls `POST /api/labels` and immediately adds the new label to the ticket.
- [ ] The picker is usable by all authenticated users (no role restriction).

### Ticket cards and list rows

- [ ] `TicketSummary.labels` (already typed in `src/types/index.ts`) is populated by the API responses for the board and list views.
- [ ] On the Kanban board card, up to 3 label chips are shown. If more than 3, show "+N more" overflow.
- [ ] In the list/table view, labels are shown in a compact chip row. No overflow truncation in list view — wrap allowed.
- [ ] Chips render as a small rounded badge with the label's `color` as background and white or dark text (determined by luminance of the color).

---

## API Contract

### `GET /api/labels`

Returns all labels ordered by name. Includes ticket count.

**Response 200**
```ts
{
  labels: {
    id: string;
    name: string;
    color: string;
    _count: { tickets: number };
  }[];
}
```

No auth restriction — any authenticated user may fetch the label list (needed for the ticket picker).

---

### `POST /api/labels`

Creates a new label.

**Request body**
```ts
{
  name: string;   // required, max 50 chars
  color?: string; // optional hex string, defaults to "#6b7280"
}
```

**Response 201**
```ts
{ id: string; name: string; color: string }
```

Returns 400 if `name` is empty or > 50 chars. Returns 409 if a label with the same name already exists (case-insensitive match). Restricted to `ADMIN` only.

---

### `PATCH /api/labels/[id]`

Updates name and/or color of a label.

**Request body**
```ts
{
  name?: string;
  color?: string;
}
```

**Response 200**
```ts
{ id: string; name: string; color: string }
```

Returns 404 if the label does not exist. Returns 409 on name collision. Restricted to `ADMIN` only.

---

### `DELETE /api/labels/[id]`

Deletes the label. Prisma removes all rows from `_TicketLabels` that reference this label automatically (implicit many-to-many cascade).

**Response 204** — no body.

Returns 404 if the label does not exist. Restricted to `ADMIN` only.

---

### `POST /api/tickets/[id]/labels`

Adds a label to a ticket.

**Request body**
```ts
{ labelId: string }
```

**Response 200**
```ts
{ ticketId: string; labelId: string }
```

Uses Prisma `connect` on the implicit relation. Returns 404 if ticket or label does not exist. Returns 409 if the label is already on the ticket (idempotent option: treat as 200 instead — see Edge Cases). Available to all authenticated users.

---

### `DELETE /api/tickets/[id]/labels/[labelId]`

Removes a label from a ticket.

**Response 204** — no body.

Uses Prisma `disconnect` on the implicit relation. Returns 404 if ticket or label does not exist. Returns 404 if the label is not on the ticket. Available to all authenticated users.

---

## Component List

| Component | File | Notes |
|---|---|---|
| `LabelsAdminPage` | `src/app/(admin)/labels/page.tsx` | Server component. Fetches labels with ticket counts. Renders `LabelAdminTable`. |
| `LabelAdminTable` | `src/components/labels/LabelAdminTable.tsx` | Client component. Manages inline edit/delete state. |
| `LabelAdminRow` | `src/components/labels/LabelAdminRow.tsx` | Single row. Switches between view mode and edit mode. Handles color picker. |
| `NewLabelForm` | `src/components/labels/NewLabelForm.tsx` | Controlled form at the top of the admin page. Posts to `/api/labels`. |
| `LabelPicker` | `src/components/labels/LabelPicker.tsx` | Multi-select combobox for use on ticket detail. Handles add/remove/create. |
| `LabelChip` | `src/components/labels/LabelChip.tsx` | Reusable colored badge. Accepts `{ name, color }`. Used on cards, list rows, picker options. |

`LabelChip` is the only component shared between admin and ticket views. Keep it under 40 lines. It computes text color (white vs. dark) based on hex luminance using a utility function in `src/lib/utils.ts`.

`LabelPicker` is a Client Component that receives the initial ticket labels and the full label list as props, then manages delta state locally. It fires individual add/remove API calls on each selection change (no batch save).

---

## Build Order

1. Database Engineer: run `npx prisma migrate dev` to confirm the `Label` table and `_TicketLabels` join table exist in `dev.db`. If they already exist, no migration is needed — verify only.
2. Backend Engineer: implement `GET /api/labels` and `POST /api/labels`
3. Backend Engineer: implement `PATCH /api/labels/[id]` and `DELETE /api/labels/[id]`
4. Backend Engineer: implement `POST /api/tickets/[id]/labels` and `DELETE /api/tickets/[id]/labels/[labelId]`
5. Backend Engineer: update `GET /api/tickets` and `GET /api/tickets/[id]` to include `labels` in the response (include the `labels` relation in the Prisma query — it is already typed in `TicketSummary`)
6. Frontend Engineer: build `LabelChip`
7. Frontend Engineer: build `NewLabelForm`, `LabelAdminRow`, `LabelAdminTable`, `LabelsAdminPage`
8. Frontend Engineer: build `LabelPicker` and integrate into the ticket detail view
9. Frontend Engineer: render `LabelChip` items on Kanban board cards and list rows using the existing `TicketSummary.labels` field

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Adding a label that is already on the ticket | API returns 200 (treat as idempotent). No duplicate row is created. Prisma `connect` is a no-op on an existing relation. |
| Deleting a label that is applied to 200+ tickets | `DELETE /api/labels/[id]` triggers Prisma implicit cascade delete on `_TicketLabels`. All 200+ join rows are removed. This is a single DB transaction — no N+1. |
| Label name collision on create (case-insensitive) | API returns 409 with message: "A label with this name already exists." The admin UI shows the error inline next to the name field. |
| Hex color input is invalid format | API accepts any non-empty string for `color` — it does not validate hex format. The Frontend enforces format via `<input type="color">` which always produces valid hex. |
| Chip text contrast | `LabelChip` computes relative luminance from the hex color. If luminance > 0.4, use dark text (`text-gray-900`). Otherwise use white (`text-white`). |
| Label name is 51+ characters | API returns 400. Admin form disables submit while the field exceeds 50 chars (character counter shown). |
| User on a non-ADMIN role tries to POST /api/labels | Returns 403. The frontend should not show the "New label" form to non-admins, but the API enforces this independently. |
| Two users add the same label to the same ticket concurrently | Prisma `connect` is idempotent. The second call is a no-op. No error. |
| `LabelPicker` opens on a ticket with 0 labels | Picker renders the full label list. No checked items. Functions normally. |

---

## Out of Scope (Phase 1)

- Label grouping or categories (e.g., "Priority labels" vs. "Content type labels")
- Label archiving / soft delete (Phase 1 is hard delete only)
- Bulk label application to multiple tickets at once
- Filtering the ticket board or list by label (Phase 2 filter addition)
- Label usage analytics (which labels are most applied)
- Import/export of label definitions

---

## Architect's Notes

The `Label` model and the `Ticket.labels` relation are already in `schema.prisma` and `src/types/index.ts` (`TicketSummary.labels` is typed). This means the data layer is partially done — but the API routes, admin UI, and picker components are all missing. The DB Engineer's first task is purely verification, not new schema work.

The decision to treat `POST /api/tickets/[id]/labels` as idempotent (200 on duplicate) rather than 409 is intentional. The picker component may call add and remove in rapid succession if a user toggles quickly. Idempotent semantics prevent spurious errors from race conditions in the UI.

Admin-only restriction on label write operations is enforced at the API layer. Team Leads and Members can add/remove labels on tickets but cannot create, rename, or delete labels from the library. This keeps the label vocabulary controlled without blocking day-to-day ticket work.
