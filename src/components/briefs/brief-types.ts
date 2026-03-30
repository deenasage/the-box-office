// SPEC: ai-brief.md
// Shared Brief domain types used across BriefDetail sub-components.

import { BriefStatus } from "@prisma/client";

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
  creator: { id: string; name: string };
  epic?: { id: string; name: string } | null;
  attachments: Attachment[];
  tickets: BriefTicket[];
  createdAt: Date | string;
  updatedAt: Date | string;
}
