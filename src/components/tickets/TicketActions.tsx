// SPEC: design-improvements.md
// SPEC: tickets.md
// SPEC: skillsets.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketStatus, TicketSize, Team } from "@prisma/client";
import { notify } from "@/lib/toast";
import { STATUS_LABELS } from "@/lib/constants";
import { SkillsetSelector } from "@/components/skillsets/SkillsetSelector";

const STATUSES = Object.values(TicketStatus);
const SIZES = Object.values(TicketSize);
const SIZE_LABELS: Record<TicketSize, string> = {
  XS: "XS (2h)", S: "S (4h)", M: "M (8h)", L: "L (20h)", XL: "XL (36h)", XXL: "XXL (72h)",
};

interface TicketActionsProps {
  ticket: {
    id: string;
    status: TicketStatus;
    size: TicketSize | null;
    assigneeId: string | null;
    /** Human-readable name of the current assignee, used as fallback when the user isn't in the users list */
    assigneeName?: string | null;
    sprintId: string | null;
    /** Human-readable name of the current sprint, used as fallback when the sprint isn't in the sprints list */
    sprintName?: string | null;
    team: Team;
    requiredSkillsetId?: string | null;
  };
  users: { id: string; name: string; team: Team | null }[];
  sprints: { id: string; name: string; isActive: boolean }[];
  /** Fields that should be shown but not editable (e.g. for stakeholder roles) */
  readOnlyFields?: string[];
}

export function TicketActions({ ticket, users, sprints, readOnlyFields = [] }: TicketActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const ro = new Set(readOnlyFields);
  const [requiredSkillsetId, setRequiredSkillsetId] = useState<string | null>(
    ticket.requiredSkillsetId ?? null
  );

  // Ensure the current assignee appears in the list even if the users array
  // doesn't include them (prevents the raw CUID showing in SelectValue).
  const assigneeInList = !ticket.assigneeId || users.some((u) => u.id === ticket.assigneeId);
  const sprintInList = !ticket.sprintId || sprints.some((s) => s.id === ticket.sprintId);

  async function update(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      const field = Object.keys(data)[0];
      const labels: Record<string, string> = {
        status: "Status", size: "Size", assigneeId: "Assignee", sprintId: "Sprint",
        requiredSkillsetId: "Required Skillset",
      };
      notify.success(`${labels[field] ?? "Ticket"} updated`);
      router.refresh();
    } catch {
      notify.error("Failed to update ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
    {saving && (
      <p className="text-xs text-muted-foreground animate-pulse" aria-live="polite">Saving…</p>
    )}
    <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select
          value={ticket.status}
          onValueChange={(v) => update({ status: v })}
          disabled={saving}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>{STATUS_LABELS[ticket.status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Size</label>
        <Select
          value={ticket.size ?? "none"}
          onValueChange={(v) => update({ size: v === "none" ? null : v })}
          disabled={saving || ro.has("size")}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>{ticket.size ? SIZE_LABELS[ticket.size] : "Unsized"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unsized</SelectItem>
            {SIZES.map((s) => (
              <SelectItem key={s} value={s}>{SIZE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Assignee</label>
        <Select
          value={ticket.assigneeId ?? "none"}
          onValueChange={(v) => update({ assigneeId: v === "none" ? null : v })}
          disabled={saving || ro.has("assigneeId")}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>
              {ticket.assigneeId
                ? (users.find((u) => u.id === ticket.assigneeId)?.name
                    ?? ticket.assigneeName
                    ?? ticket.assigneeId)
                : "Unassigned"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {/* Fallback: include current assignee if not in the users list */}
            {!assigneeInList && ticket.assigneeId && (
              <SelectItem value={ticket.assigneeId}>
                {ticket.assigneeName ?? ticket.assigneeId}
              </SelectItem>
            )}
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Sprint</label>
        <Select
          value={ticket.sprintId ?? "none"}
          onValueChange={(v) => update({ sprintId: v === "none" ? null : v })}
          disabled={saving || ro.has("sprintId")}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue>
              {ticket.sprintId
                ? (sprints.find((s) => s.id === ticket.sprintId)?.name
                    ?? ticket.sprintName
                    ?? ticket.sprintId)
                : "No sprint"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No sprint</SelectItem>
            {/* Fallback: include current sprint if not in the sprints list */}
            {!sprintInList && ticket.sprintId && (
              <SelectItem value={ticket.sprintId}>
                {ticket.sprintName ?? ticket.sprintId}
              </SelectItem>
            )}
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}{s.isActive ? " ✓" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ticket.team === Team.DESIGN && (
        <div className="col-span-2">
          <SkillsetSelector
            value={requiredSkillsetId}
            team={ticket.team}
            disabled={saving}
            onChange={(id) => {
              setRequiredSkillsetId(id);
              update({ requiredSkillsetId: id });
            }}
          />
        </div>
      )}
    </div>
    </div>
  );
}
