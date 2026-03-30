// SPEC: ai-copilot.md
import { toISO, fetchSprintContext } from "./context-sprints";
import { fetchEpicContext } from "./context-epics";
import { fetchTicketContext } from "./context-tickets";
import { fetchDependencyContext } from "./context-dependencies";
import { buildTeamCapacity } from "./context-capacity";
import { fetchBriefContext } from "./context-briefs";

// ── Re-export all public interfaces so callers importing from this path still work
export type { SprintSummary } from "./context-sprints";
export type { EpicSummary } from "./context-epics";
export type { TicketSummary } from "./context-tickets";
export type { TeamCapacitySummary } from "./context-capacity";
export type { BriefSummary } from "./context-briefs";

import type { SprintSummary } from "./context-sprints";
import type { EpicSummary } from "./context-epics";
import type { TicketSummary } from "./context-tickets";
import type { TeamCapacitySummary } from "./context-capacity";
import type { BriefSummary } from "./context-briefs";
import type { SequencingWarning } from "@/lib/dependencies";

export interface CopilotContext {
  assembledAt: string;
  activeSprint: SprintSummary | null;
  upcomingSprints: SprintSummary[];
  recentlyClosed: SprintSummary[];
  epics: EpicSummary[];
  openTickets: TicketSummary[];
  teamCapacity: TeamCapacitySummary[];
  sequencingWarnings: SequencingWarning[];
  recentBriefs: BriefSummary[];
}

export async function assembleCopilotContext(): Promise<CopilotContext> {
  const today = new Date();

  // Wave 1: everything that has no inter-dependencies runs in parallel.
  // Sprint context must resolve first because capacity needs the raw sprint rows.
  const [sprintCtx, epics, openTickets, sequencingWarnings, recentBriefs] =
    await Promise.all([
      fetchSprintContext(today),
      fetchEpicContext(),
      fetchTicketContext(),
      fetchDependencyContext(),
      fetchBriefContext(),
    ]);

  // Wave 2: capacity requires the raw sprint rows from wave 1.
  const teamCapacity = await buildTeamCapacity(
    sprintCtx.activeSprintRaw,
    sprintCtx.upcomingSprintsRaw,
    sprintCtx.recentlyClosedRaw
  );

  // ── Context size management ───────────────────────────────────────────────
  let contextTrimmed = false;
  let finalBriefs = recentBriefs;
  let finalRecentlyClosed = sprintCtx.recentlyClosed;

  const ctx: CopilotContext = {
    assembledAt: toISO(today),
    activeSprint: sprintCtx.activeSprint,
    upcomingSprints: sprintCtx.upcomingSprints,
    recentlyClosed: finalRecentlyClosed,
    epics,
    openTickets,
    teamCapacity,
    sequencingWarnings,
    recentBriefs: finalBriefs,
  };

  let json = JSON.stringify(ctx);

  // Drop oldest briefs first if over limit
  while (json.length > 80_000 && finalBriefs.length > 0) {
    contextTrimmed = true;
    finalBriefs = finalBriefs.slice(0, -1);
    json = JSON.stringify({ ...ctx, recentBriefs: finalBriefs, recentlyClosed: finalRecentlyClosed });
  }

  // Then drop oldest closed sprint
  while (json.length > 80_000 && finalRecentlyClosed.length > 0) {
    contextTrimmed = true;
    finalRecentlyClosed = finalRecentlyClosed.slice(0, -1);
    json = JSON.stringify({ ...ctx, recentBriefs: finalBriefs, recentlyClosed: finalRecentlyClosed });
  }

  if (contextTrimmed) {
    console.warn(
      `[copilot-context] Context trimmed to ${json.length} chars — historical data dropped.`
    );
  }

  return {
    ...ctx,
    recentBriefs: finalBriefs,
    recentlyClosed: finalRecentlyClosed,
  };
}
