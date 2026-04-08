// SPEC: brief-to-epic-workflow.md
// SPEC: handoffs
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { HandoffChecklist, type HandoffChecklistItem } from "./HandoffChecklist";

interface AvailableSprint {
  id: string;
  name: string;
}

interface SprintCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprintName: string;
  loadingNextSprints: boolean;
  closing: boolean;
  destination: string;
  onDestinationChange: (value: string) => void;
  availableSprints: AvailableSprint[];
  handoffItems: HandoffChecklistItem[];
  handoffNextSprintId: string | null;
  handoffNextSprintName: string | null;
  onClose: () => void;
}

// ── DestinationPicker ─────────────────────────────────────────────────────────

function DestinationPicker({
  destination,
  onChange,
  availableSprints,
}: {
  destination: string;
  onChange: (value: string) => void;
  availableSprints: AvailableSprint[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Move incomplete tickets to:</p>
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="radio"
            name="close-destination"
            value="backlog"
            checked={destination === "backlog"}
            onChange={() => onChange("backlog")}
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
              onChange={() => onChange(s.id)}
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
  );
}

// ── SprintCloseDialog ─────────────────────────────────────────────────────────

export function SprintCloseDialog({
  open,
  onOpenChange,
  sprintName,
  loadingNextSprints,
  closing,
  destination,
  onDestinationChange,
  availableSprints,
  handoffItems,
  handoffNextSprintId,
  handoffNextSprintName,
  onClose,
}: SprintCloseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Loading sprints…
            </div>
          ) : (
            <DestinationPicker
              destination={destination}
              onChange={onDestinationChange}
              availableSprints={availableSprints}
            />
          )}

          {/* Handoff checklist — only shown when unscheduled dependents exist */}
          {!loadingNextSprints && handoffItems.length > 0 && (
            <HandoffChecklist
              items={handoffItems}
              nextSprintId={handoffNextSprintId}
              nextSprintName={handoffNextSprintName}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={closing}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={onClose}
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
  );
}
