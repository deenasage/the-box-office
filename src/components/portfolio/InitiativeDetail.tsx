// SPEC: design-improvements.md
// SPEC: portfolio-view.md
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { EpicStatusBadge } from "./EpicStatusBadge";
import { LifecycleProgressBar } from "./LifecycleProgressBar";
import { BriefsSection } from "./BriefsSection";
import { TicketsByTeamAccordion } from "./TicketsByTeamAccordion";
import { SprintTimeline } from "./SprintTimeline";
import { formatDate } from "@/lib/utils";
import { notify } from "@/lib/toast";
import { PortfolioDetail, PortfolioDetailTeamGroup } from "./portfolio-types";
import { Team } from "@prisma/client";
import { RefreshCw, Link2 } from "lucide-react";

interface InitiativeDetailProps {
  data: PortfolioDetail;
  canSync: boolean;
}

export function InitiativeDetail({ data, canSync }: InitiativeDetailProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [selectedBriefId, setSelectedBriefId] = useState<string>("all");
  const { epic, briefs, ticketsByTeam } = data;

  // Collect unique briefIds that appear on tickets in this epic
  const linkedBriefIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of ticketsByTeam) {
      for (const ticket of group.tickets) {
        if (ticket.briefId) ids.add(ticket.briefId);
      }
    }
    return ids;
  }, [ticketsByTeam]);

  // Only show briefs that have at least one ticket in this epic
  const filterableBriefs = useMemo(
    () => briefs.filter((b) => linkedBriefIds.has(b.id)),
    [briefs, linkedBriefIds]
  );

  // Apply brief filter — drop empty team groups after filtering
  const filteredTicketsByTeam = useMemo((): PortfolioDetailTeamGroup[] => {
    if (selectedBriefId === "all") return ticketsByTeam;
    return ticketsByTeam
      .map((group) => ({
        ...group,
        tickets: group.tickets.filter((t) => t.briefId === selectedBriefId),
      }))
      .filter((group) => group.tickets.length > 0);
  }, [ticketsByTeam, selectedBriefId]);

  const totalTickets = filteredTicketsByTeam.reduce((s, g) => s + g.tickets.length, 0);
  const blockedTickets = filteredTicketsByTeam
    .flatMap((g) => g.tickets)
    .filter((t) => t.status === "BLOCKED")
    .length;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/epics/${epic.id}/sync-status`, { method: "POST" });
      if (!res.ok) {
        notify.error("Failed to sync status");
        return;
      }
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  const dateRange =
    epic.startDate && epic.endDate
      ? `${formatDate(epic.startDate)} – ${formatDate(epic.endDate)}`
      : epic.startDate
      ? `From ${formatDate(epic.startDate)}`
      : "No dates set";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <div
              className="h-4 w-4 rounded-full shrink-0 border"
              style={{ backgroundColor: epic.color }}
              aria-hidden="true"
            />
            <h1 className="text-2xl font-semibold tracking-tight break-words">{epic.name}</h1>
            <EpicStatusBadge status={epic.status} />
            {epic.team && <TeamBadge team={epic.team as Team} />}
          </div>
          {canSync && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              Sync Status
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{dateRange}</p>
        {epic.description && (
          <p className="text-sm text-foreground/80 max-w-prose">{epic.description}</p>
        )}
      </div>

      {/* Lifecycle */}
      <section aria-labelledby="lifecycle-heading">
        <h2 id="lifecycle-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Lifecycle
        </h2>
        <LifecycleProgressBar status={epic.status} />
      </section>

      {/* Briefs */}
      <section aria-labelledby="briefs-heading">
        <h2 id="briefs-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Briefs
        </h2>
        <BriefsSection briefs={briefs} />
      </section>

      {/* Tickets by Team */}
      <section aria-labelledby="tickets-heading">
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <h2 id="tickets-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Tickets by Team
            <span className="ml-2 text-xs font-normal normal-case">({totalTickets} total)</span>
          </h2>

          {filterableBriefs.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="brief-filter"
                className="text-xs text-muted-foreground whitespace-nowrap"
              >
                Filter by brief
              </label>
              <Select
                value={selectedBriefId}
                onValueChange={(v) => setSelectedBriefId(v ?? "all")}
              >
                <SelectTrigger
                  id="brief-filter"
                  className="h-8 text-xs w-48"
                  aria-label="Filter tickets by brief"
                >
                  <SelectValue placeholder="All briefs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All briefs</SelectItem>
                  {filterableBriefs.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TicketsByTeamAccordion ticketsByTeam={filteredTicketsByTeam} />
      </section>

      {/* Sprint Timeline — unfiltered for full context */}
      <section aria-labelledby="sprint-timeline-heading">
        <h2 id="sprint-timeline-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Sprint Timeline
        </h2>
        <SprintTimeline ticketsByTeam={ticketsByTeam} />
      </section>

      {/* Dependencies */}
      <section aria-labelledby="deps-heading">
        <h2 id="deps-heading" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Dependencies
        </h2>
        <div className="flex items-center gap-3 text-sm border rounded-lg px-4 py-3">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>
            {blockedTickets > 0 ? (
              <>
                {blockedTickets} blocked {blockedTickets === 1 ? "ticket" : "tickets"}.{" "}
              </>
            ) : (
              <span className="text-muted-foreground">No blocked tickets. </span>
            )}
            <Link href={`/epics/${epic.id}/dependencies`} className="underline text-primary">
              View dependency map
            </Link>
          </span>
        </div>
      </section>
    </div>
  );
}
