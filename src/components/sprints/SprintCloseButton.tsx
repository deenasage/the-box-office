// SPEC: brief-to-epic-workflow.md
// SPEC: handoffs
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { notify } from "@/lib/toast";
import { TicketStatus, Team } from "@prisma/client";
import {
  SprintCarryoverModal,
  type CarryoverSuggestion,
} from "./SprintCarryoverModal";
import { SprintCloseDialog } from "./SprintCloseDialog";
import { type HandoffChecklistItem } from "./HandoffChecklist";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  sprintId: string;
  sprintName: string;
  isActive: boolean;
  isAdminOrLead: boolean;
}

interface CloseResult {
  carriedOver: number;
  nextSprintId: string | null;
}

interface AvailableSprint {
  id: string;
  name: string;
}

interface HandoffTicketRef {
  id: string;
  title: string;
  status: TicketStatus;
  team: Team;
  sprint: { id: string; name: string; startDate: string } | null;
}

interface HandoffsApiResponse {
  data: {
    id: string;
    blocker: HandoffTicketRef;
    dependent: HandoffTicketRef;
    sequencing: string;
  }[];
  nextSprint: { id: string; name: string } | null;
}

// ── SprintCloseButton ─────────────────────────────────────────────────────────

export function SprintCloseButton({
  sprintId,
  sprintName,
  isActive,
  isAdminOrLead,
}: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [carryoverOpen, setCarryoverOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CarryoverSuggestion[]>([]);
  const [availableSprints, setAvailableSprints] = useState<AvailableSprint[]>([]);
  const [destination, setDestination] = useState<string>("backlog");
  const [loadingNextSprints, setLoadingNextSprints] = useState(false);
  const [handoffItems, setHandoffItems] = useState<HandoffChecklistItem[]>([]);
  const [handoffNextSprintId, setHandoffNextSprintId] = useState<string | null>(null);
  const [handoffNextSprintName, setHandoffNextSprintName] = useState<string | null>(null);

  if (!isActive || !isAdminOrLead) return null;

  async function openConfirm() {
    setConfirmOpen(true);
    setDestination("backlog");
    setHandoffItems([]);
    setHandoffNextSprintId(null);
    setHandoffNextSprintName(null);
    setLoadingNextSprints(true);
    try {
      const [sprintsRes, handoffsRes] = await Promise.all([
        fetch("/api/sprints"),
        fetch(`/api/sprints/${sprintId}/handoffs`),
      ]);
      if (sprintsRes.ok) {
        const json = (await sprintsRes.json()) as {
          data: { id: string; name: string; isActive: boolean; endDate: string }[];
        };
        const now = new Date();
        const future = json.data.filter(
          (s) => !s.isActive && s.id !== sprintId && new Date(s.endDate) > now
        );
        setAvailableSprints(future);
        if (future.length > 0) setDestination(future[0].id);
      }
      if (handoffsRes.ok) {
        const handoffsJson = (await handoffsRes.json()) as HandoffsApiResponse;
        const NEARLY_DONE = new Set<TicketStatus>([TicketStatus.DONE, TicketStatus.IN_REVIEW]);
        const unscheduled = handoffsJson.data.filter(
          (h) => h.dependent.sprint === null && NEARLY_DONE.has(h.blocker.status)
        );
        setHandoffItems(
          unscheduled.map((h) => ({
            handoffId: h.id,
            blocker: h.blocker,
            dependent: h.dependent,
          }))
        );
        if (handoffsJson.nextSprint) {
          setHandoffNextSprintId(handoffsJson.nextSprint.id);
          setHandoffNextSprintName(handoffsJson.nextSprint.name);
        }
      }
    } catch {
      // Non-fatal — checklist simply won't appear
    } finally {
      setLoadingNextSprints(false);
    }
  }

  async function fetchCarryoverData() {
    try {
      const carryoverRes = await fetch(`/api/sprints/${sprintId}/carryover`);
      if (carryoverRes.ok) {
        const json = (await carryoverRes.json()) as { data: CarryoverSuggestion[] };
        setSuggestions(json.data);
      }
    } catch {
      // Non-fatal
    }
  }

  async function handleClose() {
    setClosing(true);
    const targetSprintId = destination === "backlog" ? null : destination;
    try {
      const res = await fetch(`/api/sprints/${sprintId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSprintId }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        notify.error(json.error ?? "Failed to close sprint");
        return;
      }
      const json = (await res.json()) as { data: CloseResult };
      setConfirmOpen(false);
      router.refresh();
      if (json.data.carriedOver > 0) {
        if (targetSprintId) {
          notify.success(
            `Sprint closed. ${json.data.carriedOver} ticket${json.data.carriedOver !== 1 ? "s" : ""} moved to next sprint.`
          );
        } else {
          await fetchCarryoverData();
          setCarryoverOpen(true);
        }
      } else {
        notify.success("Sprint closed — all tickets were completed.");
      }
    } catch {
      notify.error("Network error — please try again");
    } finally {
      setClosing(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
        onClick={openConfirm}
        aria-label={`Close sprint ${sprintName}`}
      >
        <XCircle className="h-3.5 w-3.5 mr-1.5" aria-hidden />
        Close Sprint
      </Button>

      <SprintCloseDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        sprintName={sprintName}
        loadingNextSprints={loadingNextSprints}
        closing={closing}
        destination={destination}
        onDestinationChange={setDestination}
        availableSprints={availableSprints}
        handoffItems={handoffItems}
        handoffNextSprintId={handoffNextSprintId}
        handoffNextSprintName={handoffNextSprintName}
        onClose={handleClose}
      />

      <SprintCarryoverModal
        sprintId={sprintId}
        open={carryoverOpen}
        onOpenChange={setCarryoverOpen}
        suggestions={suggestions}
        availableSprints={availableSprints}
        onRefresh={() => router.refresh()}
      />
    </>
  );
}
