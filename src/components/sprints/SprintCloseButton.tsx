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
  const [destination, setDestination] = useState<string>("backlog");
  const [loadingNextSprints, setLoadingNextSprints] = useState(false);

  if (!isActive || !isAdminOrLead) return null;

  async function openConfirm() {
    setConfirmOpen(true);
    setDestination("backlog");
    setLoadingNextSprints(true);
    try {
      const res = await fetch("/api/sprints");
      if (res.ok) {
        const json = (await res.json()) as {
          data: { id: string; name: string; isActive: boolean; endDate: string }[];
        };
        const now = new Date();
        const future = json.data.filter(
          (s) => !s.isActive && s.id !== sprintId && new Date(s.endDate) > now
        );
        setAvailableSprints(future);
        // Pre-select the first available future sprint
        if (future.length > 0) setDestination(future[0].id);
      }
    } catch {
      // Non-fatal
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
          // Tickets moved directly to the chosen sprint — simple toast
          notify.success(
            `Sprint closed. ${json.data.carriedOver} ticket${json.data.carriedOver !== 1 ? "s" : ""} moved to next sprint.`
          );
        } else {
          // Backlog — open per-ticket carryover modal for individual routing
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

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md" aria-describedby="close-sprint-desc">
          <DialogHeader>
            <DialogTitle>Close sprint &quot;{sprintName}&quot;?</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p id="close-sprint-desc" className="text-sm text-muted-foreground">
              Non-done tickets will be moved out of this sprint. This action cannot be undone.
            </p>

            {loadingNextSprints ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading sprints…
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Move incomplete tickets to:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="close-destination"
                      value="backlog"
                      checked={destination === "backlog"}
                      onChange={() => setDestination("backlog")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Backlog</span>
                  </label>
                  {availableSprints.map((s) => (
                    <label key={s.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="close-destination"
                        value={s.id}
                        checked={destination === s.id}
                        onChange={() => setDestination(s.id)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))}
                </div>
                {availableSprints.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No future sprints found — tickets will go to the backlog.
                  </p>
                )}
              </div>
            )}
          </div>

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
              disabled={closing || loadingNextSprints}
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

      {/* Carryover modal — shown after backlog close with pending tickets */}
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
