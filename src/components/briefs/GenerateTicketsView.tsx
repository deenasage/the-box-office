// SPEC: design-improvements.md
// SPEC: smart-tickets.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/toast";
import {
  ChevronLeft, Sparkles, Loader2, AlertTriangle,
  CheckCircle2, RotateCcw, Ticket,
} from "lucide-react";
import { BriefStatus, GenerationStatus, type Team } from "@prisma/client";
import { parseJsonSafe } from "@/lib/utils";
import { GenerateTicketCard, TicketCardRow } from "./GenerateTicketCard";
import { TEAM_LABELS } from "@/lib/constants";

interface BriefSummary {
  id: string;
  title: string;
  status: BriefStatus;
  requiredTeams: string | null;
  creatorId: string;
  epicId: string | null;
}

interface JobRow {
  id: string;
  status: GenerationStatus;
  teamResults: string | null;
  errorMessage: string | null;
  aiPromptTokens: number | null;
  aiOutputTokens: number | null;
  createdAt: Date | string;
}

interface TeamResult {
  team: string;
  status: "CREATED" | "SKIPPED" | "FAILED";
  ticketId: string | null;
  reason: string | null;
}

interface Props {
  brief: BriefSummary;
  tickets: TicketCardRow[];
  jobs: JobRow[];
  canGenerate: boolean;
}

const STATUS_BADGE: Record<GenerationStatus, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  RUNNING: "bg-violet-50 text-violet-700 border-violet-200",
  DONE: "bg-[#008146]/10 text-[#008146] border-[#008146]/30",
  FAILED: "bg-destructive/10 text-destructive border-destructive/20",
};

export function GenerateTicketsView({ brief, tickets: initialTickets, jobs: initialJobs, canGenerate }: Props) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [jobs, setJobs] = useState(initialJobs);
  const [generating, setGenerating] = useState(false);

  const latestJob = jobs[0];
  const hasExistingTickets = tickets.length > 0;
  const requiredTeams = parseJsonSafe<string[]>(brief.requiredTeams, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/briefs/${brief.id}/generate-tickets`, { method: "POST" });
      const data = await res.json() as {
        error?: string;
        ticketsCreated?: number;
        existingTicketsWarning?: string | null;
        teamResults?: TeamResult[];
      };

      if (!res.ok) {
        notify.error(data.error ?? "Generation failed.");
        setGenerating(false);
        return;
      }

      if (data.existingTicketsWarning) {
        notify.success(`${data.ticketsCreated} ticket(s) generated. ${data.existingTicketsWarning}`);
      } else {
        notify.success(`${data.ticketsCreated} ticket(s) generated.`);
      }

      // Refresh data from server
      router.refresh();
    } catch {
      notify.error("Generation failed — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href={`/briefs/${brief.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Brief
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Generated Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{brief.title}</p>
        </div>
        {canGenerate && brief.status === BriefStatus.FINALIZED && (
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating || latestJob?.status === GenerationStatus.RUNNING}
            variant={hasExistingTickets ? "outline" : "default"}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <>{hasExistingTickets ? <RotateCcw className="h-4 w-4 mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}</>
            )}
            {hasExistingTickets ? "Re-generate Tickets" : "Generate Tickets"}
          </Button>
        )}
      </div>

      {/* Required teams summary */}
      {requiredTeams.length > 0 && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center gap-3">
          <p className="text-xs text-muted-foreground shrink-0">Required teams:</p>
          <div className="flex flex-wrap gap-1.5">
            {requiredTeams.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{TEAM_LABELS[t as Team] ?? t}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Existing tickets warning */}
      {hasExistingTickets && jobs.length > 1 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Re-generating creates additional tickets — previous tickets are not deleted.
        </div>
      )}

      {/* Latest job status */}
      {latestJob && (
        <div className="rounded-lg border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Run</p>
            <Badge variant="outline" className={STATUS_BADGE[latestJob.status]}>
              {latestJob.status}
            </Badge>
          </div>
          {latestJob.status === GenerationStatus.FAILED && latestJob.errorMessage && (
            <p className="text-sm text-destructive">{latestJob.errorMessage}</p>
          )}
          {latestJob.status === GenerationStatus.DONE && (
            <div className="flex flex-wrap gap-2">
              {parseJsonSafe<TeamResult[]>(latestJob.teamResults, []).map((r) => (
                <span
                  key={r.team}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    r.status === "CREATED"
                      ? "bg-[#008146]/10 text-[#008146] border-[#008146]/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {TEAM_LABELS[r.team as Team] ?? r.team} — {r.status.toLowerCase()}
                  {r.reason ? ` (${r.reason})` : ""}
                </span>
              ))}
            </div>
          )}
          {(latestJob.aiPromptTokens ?? 0) > 0 && (
            <p className="text-[11px] text-muted-foreground/80">
              AI usage: {latestJob.aiPromptTokens} prompt · {latestJob.aiOutputTokens} output tokens
            </p>
          )}
        </div>
      )}

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Ticket className="h-8 w-8 opacity-30" />
          <p className="text-sm">No tickets generated yet.</p>
          {canGenerate && brief.status === BriefStatus.FINALIZED && (
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Generate Now
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 inline mr-1 text-[#008146] dark:text-[#00D93A]" />
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} generated
          </p>
          <div className="grid gap-3">
            {tickets.map((ticket) => (
              <GenerateTicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
