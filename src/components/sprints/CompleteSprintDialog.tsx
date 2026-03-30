// SPEC: design-improvements.md
// SPEC: sprint-scrum.md
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TicketStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/constants";

interface IncompleteTicket {
  id: string;
  title: string;
  status: TicketStatus;
  team: string;
}

interface NextSprint {
  id: string;
  name: string;
}

interface CompleteSprintDialogProps {
  sprintId: string;
  sprintName: string;
  incompleteTickets: IncompleteTicket[];
  nextSprints: NextSprint[];
  onClose: () => void;
}

type Destination = "backlog" | string; // "backlog" or a sprint id

export function CompleteSprintDialog({
  sprintId,
  sprintName,
  incompleteTickets,
  nextSprints,
  onClose,
}: CompleteSprintDialogProps) {
  const router = useRouter();
  const [destination, setDestination] = useState<Destination>("backlog");
  const [retroNotes, setRetroNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      // Mark sprint inactive and persist retrospective notes
      const sprintRes = await fetch(`/api/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: false,
          ...(retroNotes.trim() ? { retrospectiveNotes: retroNotes.trim() } : {}),
        }),
      });
      if (!sprintRes.ok) throw new Error("Failed to complete sprint");

      // Move incomplete tickets — use allSettled so a single failure doesn't block the rest
      if (incompleteTickets.length > 0) {
        const targetSprintId = destination === "backlog" ? null : destination;
        const results = await Promise.allSettled(
          incompleteTickets.map((ticket) =>
            fetch(`/api/tickets/${ticket.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sprintId: targetSprintId }),
            }).then((r) => ({ ok: r.ok, title: ticket.title }))
          )
        );
        const failed = results
          .filter((r): r is PromiseFulfilledResult<{ ok: boolean; title: string }> =>
            r.status === "fulfilled" && !r.value.ok
          )
          .map((r) => r.value.title);
        if (failed.length > 0) {
          setError(`${failed.length} ticket${failed.length > 1 ? "s" : ""} could not be moved: ${failed.join(", ")}`);
          setLoading(false);
          return;
        }
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Sprint: {sprintName}</DialogTitle>
        </DialogHeader>

        {incompleteTickets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            All tickets are done. The sprint will be marked complete.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                {incompleteTickets.length} incomplete ticket
                {incompleteTickets.length !== 1 ? "s" : ""} will be moved:
              </p>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {incompleteTickets.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 text-sm truncate">{t.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Move to:</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="destination"
                    value="backlog"
                    checked={destination === "backlog"}
                    onChange={() => setDestination("backlog")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Backlog</span>
                </label>
                {nextSprints.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="destination"
                      value={s.id}
                      checked={destination === s.id}
                      onChange={() => setDestination(s.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Retrospective notes — optional quick capture */}
        <div className="space-y-1.5">
          <Label htmlFor="retro-notes" className="text-sm font-medium">
            Retrospective Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="retro-notes"
            value={retroNotes}
            onChange={(e) => setRetroNotes(e.target.value)}
            placeholder="What went well? What could be improved?"
            className="min-h-[80px] resize-y text-sm"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Completing…" : "Complete Sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
