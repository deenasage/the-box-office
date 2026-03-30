// SPEC: brief-to-epic-workflow.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XCircle, Loader2 } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  SprintCarryoverModal,
  type CarryoverSuggestion,
} from "./SprintCarryoverModal";

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

  if (!isActive || !isAdminOrLead) return null;

  async function fetchCarryoverData() {
    try {
      const [carryoverRes, sprintsRes] = await Promise.all([
        fetch(`/api/sprints/${sprintId}/carryover`),
        fetch(`/api/sprints`),
      ]);

      if (carryoverRes.ok) {
        const json = (await carryoverRes.json()) as { data: CarryoverSuggestion[] };
        setSuggestions(json.data);
      }

      if (sprintsRes.ok) {
        const json = (await sprintsRes.json()) as {
          data: { id: string; name: string; isActive: boolean }[];
        };
        setAvailableSprints(
          json.data.filter((s) => !s.isActive && s.id !== sprintId)
        );
      }
    } catch {
      // Non-fatal — modal will open with empty state
    }
  }

  async function handleClose() {
    setClosing(true);
    try {
      const res = await fetch(`/api/sprints/${sprintId}/close`, {
        method: "POST",
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
        await fetchCarryoverData();
        setCarryoverOpen(true);
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
        className="border-amber-400 text-amber-700 hover:bg-amber-50"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Close sprint ${sprintName}`}
      >
        <XCircle className="h-3.5 w-3.5 mr-1.5" aria-hidden />
        Close Sprint
      </Button>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md" aria-describedby="close-sprint-desc">
          <DialogHeader>
            <DialogTitle>Close sprint &quot;{sprintName}&quot;?</DialogTitle>
          </DialogHeader>
          <p id="close-sprint-desc" className="text-sm text-muted-foreground">
            Non-done tickets will be moved to the backlog and flagged for
            carryover. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={closing}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleClose}
              disabled={closing}
              aria-label="Confirm close sprint"
            >
              {closing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden />
                  Closing…
                </>
              ) : (
                "Close Sprint"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carryover modal — shown after a successful close with pending tickets */}
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
