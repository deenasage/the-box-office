// SPEC: gtm-brief-generator.md
import { SAGE_GLOSSARY } from "./sage-glossary";
import claude from "./claude-client";

export interface GtmBriefData {
  AdCreative: string | null;
  BackgroundInfo: string | null;
  Budget: string | null;
  BudgetChanges: string | null;
  CampaignDetails: string | null;
  Changes: string | null;
  Competitors: string | null;
  Contacts: string | null;
  Constraints: string | null;
  CoreThemes: string | null;
  Data: string | null;
  DateRange: string | null;
  Deadline: string | null;
  DeadlineReason: string | null;
  Deliverables: string | null;
  Description: string | null;
  Drivers: string | null;
  EndDate: string | null;
  ExpectedOutcomes: string | null;
  FinalizedModel: string | null;
  GTMDeck: string | null;
  HighLevelPlanning: string | null;
  Impact: string | null;
  LiveDate: string | null;
  LiveDateReason: string | null;
  Markets: string | null;
  Messaging: string | null;
  OtherResources: string | null;
  PreviousWork: string | null;
  ProblemStatement: string | null;
  ProductReadyDate: string | null;
  SMEs: string | null;
  SuccessMetrics: string | null;
  Title: string | null;
  UseCases: string | null;
  UserActions: string | null;
  WhichProduct: string | null;
  WhichRegion: string | null;
  WhoAreWeTargeting: string | null;
  WhyChangesMade: string | null;
}

export interface GtmBriefResult {
  data: GtmBriefData;
  promptTokens: number;
  outputTokens: number;
}

const SYSTEM_PROMPT = `You are a Routes-to-Revenue and Product Marketing Manager completing a Digital Hubs campaign brief that will be used by content, design, and web development teams. You have access to a glossary of company acronyms to help you understand the source material.

SAGE GLOSSARY:
${SAGE_GLOSSARY}

Write in full sentences, UK English, plain-spoken, confident. Do not use bullet points in your output. Use "so that", "which means", "because" to connect ideas. Aim for grade 8-10 readability. Prefer verbs over nouns. Return ONLY a JSON object — no markdown, no commentary outside the JSON.`;

function buildUserPrompt(extractedText: string): string {
  return `Extract all campaign brief fields from the following source material. Return ONLY a JSON object with exactly the fields listed below. Use null for any field where the information is not present — do not invent data. Write all non-null values in full sentences, UK English, plain-spoken and confident.

SOURCE MATERIAL:
${extractedText || "(no document text provided)"}

FIELDS TO EXTRACT (return exactly these keys):

- Title: Extremely brief title for the brief, suitable for a file name. Use glossary acronyms where appropriate.
- Description: Rich detailed summary including purpose, business context, timing, dependencies, and the overall intent of the work.
- AdCreative: Describe recommended content formats and execution types with rationale for audience fit.
- BackgroundInfo: Capture relevant background context, prior issues, and historical decisions that inform this request.
- Budget: Capture total budget or allocation discussions if mentioned.
- BudgetChanges: Describe any requested changes to budget allocation or audience targeting.
- CampaignDetails: If the work relates to an existing campaign, describe it and its intent.
- Changes: Describe specific elements that need to be changed on sage.com including relevant URLs.
- Competitors: List competitors, differentiators, strengths, weaknesses, and any messaging caution.
- Contacts: List names and roles of PMMs and RTR contacts only.
- Constraints: Time, budget, resource, technical, or organisational constraints affecting delivery.
- CoreThemes: Overarching campaign story combining all key messages and positioning written as narrative paragraphs.
- Data: Summarise data, insights, or evidence such as engagement metrics or conversion rates that support the request.
- DateRange: State any specific date range the issue or investigation relates to.
- Deadline: Any stated deadlines. Date only, no time. Infer year if not explicitly stated.
- DeadlineReason: Why the deadline has been set.
- Deliverables: Expected outputs — analyses, content changes, design updates, journey maps.
- Drivers: What is driving the change — performance issues, new priorities, compliance requirements.
- EndDate: Campaign or validity end date if specified.
- ExpectedOutcomes: Expected business and strategic outcomes, both quantitative and qualitative.
- FinalizedModel: Yes or no — has the commercial model been finalised and approved.
- GTMDeck: Link or file path to the GTM deck if provided.
- HighLevelPlanning: Yes or no — has planning commenced with the GTM Planning Team.
- Impact: Expected impact on performance — uplift, stabilisation, reduced friction.
- LiveDate: Stated or implied go-live date, including whether the launch is phase-based.
- LiveDateReason: Rationale for the selected launch date.
- Markets: Geographic markets and localisation needs.
- Messaging: All messaging pillars and key copy points with how each supports the core proposition.
- OtherResources: Links to creative assets, wireframes, or mockups only — not sage.com change URLs.
- PreviousWork: Previous research, testing, or work referenced with findings.
- ProblemStatement: Customer and internal pain points written in sentence-based phrasing.
- ProductReadyDate: Timing for product readiness.
- SMEs: Subject matter experts who may support the work.
- SuccessMetrics: Success measures — metrics, KPIs, and qualitative indicators.
- UseCases: Specific user or customer scenarios referenced.
- UserActions: Desired audience actions and flow connected to campaign goals.
- WhichProduct: Main product first, then add-ons, features, or tiers.
- WhichRegion: Which region or regions the request applies to.
- WhoAreWeTargeting: Target audience groups in detail — roles, industries, and behaviours.
- WhyChangesMade: Underlying rationale or trigger for the change being requested.

Return ONLY the JSON object. No markdown code fences. No explanation outside the JSON.`;
}

export async function generateGtmBrief(
  extractedText: string
): Promise<GtmBriefResult> {
  const message = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(extractedText),
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error(
      `Claude hit the max_tokens limit (${message.usage.output_tokens} tokens used) and returned truncated JSON. Increase max_tokens or reduce the prompt.`
    );
  }

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: GtmBriefData;
  try {
    parsed = JSON.parse(raw) as GtmBriefData;
  } catch {
    throw new Error("Claude returned invalid JSON for GTM brief: " + raw.slice(0, 300));
  }

  // Normalise every field: coerce empty strings to null, keep valid strings
  const fields: (keyof GtmBriefData)[] = [
    "AdCreative", "BackgroundInfo", "Budget", "BudgetChanges", "CampaignDetails",
    "Changes", "Competitors", "Contacts", "Constraints", "CoreThemes", "Data",
    "DateRange", "Deadline", "DeadlineReason", "Deliverables", "Description",
    "Drivers", "EndDate", "ExpectedOutcomes", "FinalizedModel", "GTMDeck",
    "HighLevelPlanning", "Impact", "LiveDate", "LiveDateReason", "Markets",
    "Messaging", "OtherResources", "PreviousWork", "ProblemStatement",
    "ProductReadyDate", "SMEs", "SuccessMetrics", "Title", "UseCases",
    "UserActions", "WhichProduct", "WhichRegion", "WhoAreWeTargeting",
    "WhyChangesMade",
  ];

  const data = {} as GtmBriefData;
  for (const field of fields) {
    const val = parsed[field];
    data[field] =
      typeof val === "string" && val.trim() !== "" ? val.trim() : null;
  }

  return {
    data,
    promptTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}
