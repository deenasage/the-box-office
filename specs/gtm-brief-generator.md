# GTM Brief Generator

## Overview

Replace the existing generic brief creation flow with a marketing brief generator that mirrors
the Copilot/Power Automate briefing agent. User uploads a PDF, selects GTM as the brief type,
and Claude extracts 40+ structured fields from the document using a detailed domain-specific
prompt with the Sage glossary baked in as context.

## Brief Types

Start with GTM only. Architecture must support adding Campaign Launch, Campaign Update,
and Problem Statement later without schema changes.

## Schema Changes (Brief model)

Add two fields to the existing `Brief` model:

```prisma
briefType   String?   // "GTM" | "CAMPAIGN_LAUNCH" | "CAMPAIGN_UPDATE" | "PROBLEM_STATEMENT"
briefData   String?   // JSON blob of all 40+ extracted fields
```

Keep all existing fields — they remain valid for backwards compatibility.

## Extracted Fields (stored as JSON in briefData)

All field names exactly as listed in the AI prompt:

AdCreative, BackgroundInfo, Budget, BudgetChanges, CampaignDetails, Changes,
Competitors, Contacts, Constraints, CoreThemes, Data, DateRange, Deadline,
DeadlineReason, Deliverables, Description, Drivers, EndDate, ExpectedOutcomes,
FinalizedModel, GTMDeck, HighLevelPlanning, Impact, LiveDate, LiveDateReason,
Markets, Messaging, OtherResources, PreviousWork, ProblemStatement, ProductReadyDate,
SMEs, SuccessMetrics, Title, UseCases, UserActions, WhichProduct, WhichRegion,
WhoAreWeTargeting, WhyChangesMade

## AI Prompt

Use the exact prompt from the Copilot agent (see `src/lib/ai/gtm-brief-generator.ts`).
Bake the full Sage glossary in as a constant in the prompt — do not fetch it at runtime.
Extract all 40+ fields and return as a single JSON object.

The glossary is at: src/lib/ai/sage-glossary.ts (create this file with the full table).

## Brief Creation Flow

1. User visits `/briefs/new`
2. Sees: brief type selector (GTM card, others disabled/coming soon)
3. Uploads PDF (single file, 10MB max — reuse existing attachment upload)
4. Clicks "Generate Brief"
5. PDF text extracted server-side (existing pdf-parse/mammoth logic)
6. Claude called with GTM prompt + extracted text
7. briefData saved as JSON, briefType = "GTM", status → REVIEW
8. User redirected to `/briefs/[id]`

## Brief Detail View (`/briefs/[id]`)

Show all extracted fields organized into sections matching the Word template:

- **Overview** — Title, Description, briefType badge, status badge, created date, Download button
- **Discovery** — Description
- **Who** — WhoAreWeTargeting, Competitors, Contacts
- **What** — WhichProduct, WhichRegion, ExpectedOutcomes, GTMDeck, FinalizedModel, CoreThemes, UserActions, Messaging
- **Why** — WhyChangesMade, ProblemStatement, Drivers
- **Where** — Markets
- **When** — ProductReadyDate, LiveDate, LiveDateReason, Deadline, DeadlineReason, DateRange, EndDate
- **How** — Budget, BudgetChanges, AdCreative
- **Campaign** — CampaignDetails, Changes
- **Intelligence** — BackgroundInfo, Constraints, Data, Impact, PreviousWork, SuccessMetrics, UseCases
- **Other** — SMEs, HighLevelPlanning, OtherResources, Deliverables

Each field renders as a read-only card with an edit (pencil) icon. Clicking edit opens an
inline textarea. Save calls PATCH /api/briefs/[id]/sections with the updated briefData.

Empty/null fields render as a subtle "—" placeholder, not hidden.

## Download as Word (.docx)

Endpoint: `GET /api/briefs/[id]/download`

Uses the `docx` npm package to generate a .docx file matching the Word template structure:
- Title as heading
- Sections: Discovery, Who, What, Why, Where, When, How, Other
- Each field as bold question label + paragraph answer
- Returns as application/vnd.openxmlformats-officedocument.wordprocessingml.document

Install: `npm install docx`

## Brief List (`/briefs`)

Show: title, briefType badge, status badge, created date, created by.
"New Brief" button top right.
Filter by status (DRAFT, REVIEW, APPROVED, etc.)

## API Changes

- `POST /api/briefs` — accept `briefType` in body, default "GTM"
- `POST /api/briefs/[id]/generate` — detect briefType, call appropriate generator
  - For GTM: call `generateGtmBrief(extractedText)` → save to `briefData`
  - For others: fallback to existing generic generator
- `PATCH /api/briefs/[id]/sections` — if briefType is GTM, accept `briefData` (JSON string)
  in addition to existing section fields
- `GET /api/briefs/[id]/download` — new endpoint, generate and stream .docx

## Key Rules

- `briefData` is always stored as a JSON string (not parsed — Prisma/SQLite limitation)
- Parse with JSON.parse on read, JSON.stringify on write
- If Claude returns a field as null or empty string, store as null — never invent data
- The glossary constant must be the full table from the user's markdown file
- Word download must work without any external service (pure npm, no Encodian)
