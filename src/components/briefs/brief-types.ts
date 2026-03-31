// SPEC: ai-brief.md
// SPEC: gtm-brief-generator.md
// Shared Brief domain types used across BriefDetail sub-components.

import { BriefStatus } from "@prisma/client";

// ── GTM Brief structured data ─────────────────────────────────────────────────

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

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | string;
}

export interface BriefTicket {
  id: string;
  title: string;
  team: string;
  status: string;
  size?: string | null;
}

export interface Brief {
  id: string;
  title: string;
  status: BriefStatus;
  rawInput: string;
  extractedText?: string | null;
  objective?: string | null;
  targetAudience?: string | null;
  deliverables?: string | null;
  dependencies?: string | null;
  requiredTeams?: string | null;
  timeline?: string | null;
  successMetrics?: string | null;
  clarifications?: string | null;
  aiPromptTokens?: number | null;
  aiOutputTokens?: number | null;
  briefType?: string | null;
  briefData?: string | null;
  creator: { id: string; name: string };
  epic?: { id: string; name: string } | null;
  attachments: Attachment[];
  tickets: BriefTicket[];
  createdAt: Date | string;
  updatedAt: Date | string;
}
