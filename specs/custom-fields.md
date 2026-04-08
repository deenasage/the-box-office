# Feature: Admin-Configurable Custom Fields

## Overview

Admins can define extra fields that appear on tickets beyond the standard set. Each custom field has a type (Text, Number, Select, Date, Checkbox), an optional team scope (global or one team), a required flag, a display order, and — for Select fields — an admin-configured options list. Values are stored in a dedicated `TicketCustomFieldValue` table keyed by ticket + field. Custom fields appear after standard fields in the ticket create form and in the ticket detail slide-over panel. Admin management lives at `/admin/custom-fields`.

The existing `FormTemplate` / `FormField` system handles intake forms. Custom fields are a separate concern: they extend the ticket record itself, not the intake submission. The two systems are independent.

---

## Data Model

### New models

```prisma
enum CustomFieldType {
  TEXT
  NUMBER
  SELECT
  DATE
  CHECKBOX
}

/// Admin-defined extra field applicable to all tickets (teamScope = null)
/// or to tickets belonging to a specific team (teamScope = Team value).
model CustomField {
  id         String          @id @default(cuid())
  name       String
  fieldType  CustomFieldType
  teamScope  Team?           /// null = global; non-null = scoped to that team only
  required   Boolean         @default(false)
  order      Int             @default(0) /// display order within the form/panel
  options    String?         /// JSON: string[] — populated for SELECT type only
  isActive   Boolean         @default(true) /// false = soft-deleted; hidden from new tickets
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  values     TicketCustomFieldValue[]

  @@unique([name, teamScope])   /// same name can exist once globally and once per team
  @@index([teamScope])
  @@index([isActive])
}

/// Stores the value a specific ticket has for a specific custom field.
/// value is always a string — the UI renders the appropriate input per fieldType.
model TicketCustomFieldValue {
  id       String      @id @default(cuid())
  ticketId String
  ticket   Ticket      @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  fieldId  String
  field    CustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  value    String      /// TEXT: raw string; NUMBER: stringified number; SELECT: option string;
                       /// DATE: ISO 8601 string; CHECKBOX: "true" | "false"
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@unique([ticketId, fieldId])
  @@index([ticketId])
  @@index([fieldId])
}
```

### Changes to `Ticket`

Add the relation reference (no new column on the `Ticket` table):

```prisma
model Ticket {
  // ... existing fields ...
  customFieldValues  TicketCustomFieldValue[]
}
```

### Migration notes

- Both models are new — no existing data is affected.
- `onDelete: Cascade` on `TicketCustomFieldValue` means deleting a ticket removes all its custom field values automatically.
- `onDelete: Cascade` on the `fieldId` FK means soft-deleting a `CustomField` (setting `isActive = false`) is preferred over hard-deleting. Hard-deleting a field will cascade-delete all values — include a confirmation warning in the admin UI.
- `@@unique([name, teamScope])` allows a field named "Review Notes" to exist both globally and for the SEO team independently. Prisma treats two NULL `teamScope` values as distinct for SQLite unique constraints — only one global field of a given name can exist.

---

## Value Serialization Contract

| fieldType | Stored as | UI input | Validation |
|---|---|---|---|
| TEXT | Raw string | `<Input type="text">` | Max 2000 chars |
| NUMBER | Stringified decimal, e.g. `"42.5"` | `<Input type="number">` | `parseFloat` must not be `NaN` |
| SELECT | One string matching the `options` array | `<Select>` | Must be one of the configured options |
| DATE | ISO 8601 date string, e.g. `"2026-04-15"` | shadcn `DatePicker` | Must parse as a valid date |
| CHECKBOX | `"true"` or `"false"` | `<Checkbox>` | Must be one of those two strings |

An empty string value is valid for non-required TEXT fields. Required fields with an empty or missing value are rejected at the API layer with `400`.

---

## User Stories

- As an Admin, I can navigate to `/admin/custom-fields` to see all configured custom fields so that I have a single place to manage ticket field extensions.
- As an Admin, I can create a custom field with a name, type, team scope, required flag, and display order so that teams get the extra fields they need without a code change.
- As an Admin, I can add and remove options for a SELECT-type field so that the dropdown choices stay accurate over time.
- As an Admin, I can reorder custom fields via drag-and-drop so that the most important fields appear first in the form.
- As an Admin, I can soft-delete a custom field so that it disappears from new tickets while historical values on existing tickets are preserved.
- As any authenticated user creating a ticket, I can fill in the custom fields applicable to the ticket's team (and all global fields) so that the ticket is fully described.
- As any authenticated user viewing a ticket's detail panel, I can see and edit custom field values so that the information stays current.
- As a team member, I only see custom fields scoped to my team (or global fields) — not fields scoped to other teams.

---

## Acceptance Criteria

### Admin page (`/admin/custom-fields`)

- [ ] Page is accessible only to users with `role = ADMIN`. Non-admins receive a 403 redirect.
- [ ] The page shows a table of all custom fields (including inactive ones, clearly marked).
- [ ] Table columns: Name | Type | Team Scope | Required | Order | Active | Actions.
- [ ] Each row has Edit and Delete (soft) actions.
- [ ] A "New Custom Field" form/modal at the top allows: Name (required), Type (required), Team Scope (optional — null = Global), Required toggle, initial Order value.
- [ ] For SELECT type, an "Options" section in the edit view lists current options with add/remove controls.
- [ ] Drag-to-reorder rows calls `PATCH /api/admin/custom-fields/[id]` with the updated `order` value. Reorder updates are batched: after drag ends, a single request updates the moved field's order. Adjacent fields are renumbered if needed.
- [ ] Soft-deleting a field shows a confirmation dialog: "Deactivating this field will hide it from new tickets. Existing values on tickets will be preserved." On confirm, sets `isActive = false`.
- [ ] Hard-deleting a field (permanent) is available as a secondary destructive action with an additional warning: "This will permanently delete all values stored for this field across all tickets." Calls `DELETE /api/admin/custom-fields/[id]`.

### Ticket create form

- [ ] After the standard fields section, a "Additional Fields" section renders all active custom fields applicable to the ticket's team (global fields + fields matching the selected team).
- [ ] Fields render the appropriate input per `fieldType` (see serialization contract above).
- [ ] Required custom fields block form submission if empty.
- [ ] Non-required custom fields are omitted from the POST body if left blank (not submitted as empty strings, unless TEXT fields where the user actively typed and cleared).

### Ticket detail slide-over panel

- [ ] Custom field values appear in an "Additional Fields" section in the metadata column.
- [ ] Each value renders as a read-only display by default, with an edit pencil icon on hover.
- [ ] Clicking the edit icon enables the appropriate input inline. Save calls `PATCH /api/tickets/[id]/custom-fields`. Cancel reverts the display.
- [ ] Fields with no saved value show a "—" placeholder with an "Add value" affordance.
- [ ] Fields scoped to a different team than the ticket's team are not shown.

---

## API Contract

### `GET /api/admin/custom-fields`

Returns all custom fields (active and inactive), ordered by `order` asc.

**Response 200**
```ts
{
  data: {
    id: string;
    name: string;
    fieldType: CustomFieldType;
    teamScope: Team | null;
    required: boolean;
    order: number;
    options: string[] | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
}
```

Restricted to `ADMIN` role.

---

### `POST /api/admin/custom-fields`

Creates a new custom field.

**Request body**
```ts
{
  name: string;           // required, max 100 chars
  fieldType: CustomFieldType;
  teamScope?: Team;       // omit for global
  required?: boolean;     // default false
  order?: number;         // default 0
  options?: string[];     // required if fieldType = SELECT; min 1 option
}
```

**Response 201** — same shape as a single item from the GET response.

Returns `400` if `name` is empty, `fieldType` is invalid, or `options` is missing/empty for SELECT.
Returns `409` if `@@unique([name, teamScope])` is violated.
Restricted to `ADMIN`.

---

### `PATCH /api/admin/custom-fields/[id]`

Partial update. All fields optional.

**Request body**
```ts
{
  name?: string;
  teamScope?: Team | null;
  required?: boolean;
  order?: number;
  options?: string[];    // full replacement of the options array for SELECT fields
  isActive?: boolean;
}
```

**Response 200** — same shape as the GET item.

Returns `404` if the field does not exist.
Returns `400` if `options` is set to an empty array on a SELECT field.
Restricted to `ADMIN`.

---

### `DELETE /api/admin/custom-fields/[id]`

Hard-deletes the field. Cascades to all `TicketCustomFieldValue` rows.

**Response 204** — no body.

Returns `404` if field does not exist. Restricted to `ADMIN`.

---

### `GET /api/tickets/[id]/custom-fields`

Returns the custom fields applicable to this ticket's team, with their current values.

**Response 200**
```ts
{
  data: {
    fieldId: string;
    name: string;
    fieldType: CustomFieldType;
    required: boolean;
    order: number;
    options: string[] | null;
    value: string | null;  // null if no value has been set yet
  }[];
}
```

Fields are ordered by `order` asc. Includes global fields and fields matching `ticket.team`. Excludes inactive fields.
Available to all authenticated users.

---

### `PATCH /api/tickets/[id]/custom-fields`

Upserts one or more custom field values on a ticket. Uses `db.$transaction(async tx => {})`.

**Request body**
```ts
{
  values: {
    fieldId: string;
    value: string;
  }[];
}
```

**Response 200**
```ts
{
  data: { fieldId: string; value: string }[];
}
```

Validation per entry:
- `fieldId` must exist and be active.
- Field must be applicable to the ticket's team (global or matching team scope).
- Value must pass type-specific validation (see serialization contract).
- Required fields cannot be set to an empty string.

Returns `400` with a list of per-field errors if any entry fails validation.
Returns `404` if the ticket does not exist.
Available to all authenticated users.

---

## Component List

| Component | File | Notes |
|---|---|---|
| `CustomFieldsAdminPage` | `src/app/(admin)/custom-fields/page.tsx` | Server component. Fetches all fields. |
| `CustomFieldsTable` | `src/components/custom-fields/CustomFieldsTable.tsx` | Client component. Drag-to-reorder with `@dnd-kit/sortable`. Manage edit/delete state. |
| `CustomFieldRow` | `src/components/custom-fields/CustomFieldRow.tsx` | Single row. View and edit mode. SELECT options editor inline. |
| `NewCustomFieldForm` | `src/components/custom-fields/NewCustomFieldForm.tsx` | Controlled form above the table. |
| `CustomFieldInput` | `src/components/custom-fields/CustomFieldInput.tsx` | Polymorphic input. Renders the correct control for each `fieldType`. Used in both the create form and the ticket detail panel. |
| `CustomFieldsSection` | `src/components/tickets/CustomFieldsSection.tsx` | Renders the "Additional Fields" section in the ticket detail slide-over. Fetches values from `GET /api/tickets/[id]/custom-fields`. |

`CustomFieldInput` is the shared primitive. It accepts `{ field: CustomFieldMeta, value: string | null, onChange: (v: string) => void }` and renders the appropriate shadcn control. This keeps the create form and detail panel using identical input behavior.

Drag-to-reorder uses `@dnd-kit/sortable` (already in the project if used elsewhere; if not, DB Engineer confirms it is an acceptable local dependency — it has no external API requirements).

---

## Build Order

1. Database Engineer: add `CustomFieldType` enum, `CustomField` model, `TicketCustomFieldValue` model, and `Ticket.customFieldValues` relation to `schema.prisma`. Run `npx prisma migrate dev`.
2. Backend Engineer: implement `GET/POST /api/admin/custom-fields` and `PATCH/DELETE /api/admin/custom-fields/[id]`.
3. Backend Engineer: implement `GET /api/tickets/[id]/custom-fields` and `PATCH /api/tickets/[id]/custom-fields` (with transaction and per-field validation).
4. Frontend Engineer: build `CustomFieldInput` (polymorphic input primitive).
5. Frontend Engineer: build `CustomFieldRow`, `CustomFieldsTable`, `NewCustomFieldForm`, `CustomFieldsAdminPage`.
6. Frontend Engineer: build `CustomFieldsSection` and integrate into the ticket detail slide-over.
7. Frontend Engineer: integrate custom fields into the ticket create form (call `GET /api/admin/custom-fields?active=true&teamScope=<team>` client-side when the team is selected).

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Admin soft-deletes a field that has values on 300 tickets | Values remain in `TicketCustomFieldValue`. The GET endpoint for ticket detail excludes inactive fields — values are hidden but not deleted. If the field is later reactivated, values reappear. |
| Admin hard-deletes a field | Cascades to all `TicketCustomFieldValue` rows. Admin sees a count of affected values in the confirmation dialog (fetched from the GET response `_count` in Phase 2; in Phase 1, dialog shows a generic warning). |
| SELECT field option is removed after tickets have that value | Values in `TicketCustomFieldValue` retain the old string. The detail panel renders it as a plain string prefixed with a warning icon ("Removed option: old-value"). The ticket detail edit input shows the full current options list only. |
| Required field is missing from `PATCH /api/tickets/[id]/custom-fields` | Returns `400` with per-field error. The form prevents submission client-side too, but the API enforces independently. |
| Ticket team changes after custom field values are set | Fields scoped to the old team are no longer shown in the UI. Their values remain in `TicketCustomFieldValue` but are not returned by `GET /api/tickets/[id]/custom-fields` (filtered to new team). Data is not deleted. |
| Two admins reorder fields simultaneously | Last write wins per field. `order` is an integer; concurrent reorders may result in ties (two fields with the same order value). Ties are broken by `createdAt` asc in the sort query. Phase 2 will use fractional ordering. |
| `options` is set to `[]` on a SELECT field via PATCH | API returns `400`: "SELECT fields must have at least one option." |
| Custom field name collision within the same team scope | `@@unique([name, teamScope])` triggers a Prisma unique constraint error. API catches this and returns `409 { error: "A field with this name already exists for this team scope." }`. |

---

## Out of Scope (Phase 1)

- Per-user visibility of custom fields (fields visible to some roles but not others)
- Custom field values in the kanban card view (detail panel only)
- Filtering the board or ticket list by custom field value
- Exporting custom field values in CSV/Excel
- Custom field validation rules beyond type-level validation (e.g., regex patterns, min/max for NUMBER)
- Bulk-updating a custom field value across multiple tickets
- `MULTISELECT` field type (add after SELECT is stable)
- Conditional custom field logic (show field X only when field Y = value Z)

---

## Architect's Notes

The decision to store all values as strings is intentional. It avoids a polymorphic value column or five separate value tables while keeping the data model simple. The tradeoff is that validation is entirely at the application layer, but that is true of most form systems. The serialization contract table above is the single source of truth — both the API validator and `CustomFieldInput` must implement it consistently.

The `@@unique([name, teamScope])` constraint allows the same name ("Notes") to exist as both a global field and a SEO-scoped field. This is deliberate: teams often need a field with the same semantic label but different scope. If this causes confusion in practice, Phase 2 can add a global uniqueness check at the API layer as a soft warning.

Do not reuse `FormField` or `FieldType` for custom fields. `FormField` is tied to `FormTemplate` and the intake submission flow. Custom fields extend the ticket record. Keeping them separate avoids entangling intake form logic with ticket editing logic. The `CustomFieldType` enum is a subset of `FieldType` — only the types that make sense on a persistent ticket record are included.
