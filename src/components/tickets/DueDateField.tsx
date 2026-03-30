// SPEC: labels.md
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Pencil, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils";

interface DueDateFieldProps {
  ticketId: string;
  dueDate: string | null;
  status: TicketStatus;
}

export function DueDateField({ ticketId, dueDate, status }: DueDateFieldProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = dueDate ? new Date(dueDate) : null;
  if (due) due.setHours(0, 0, 0, 0);

  const isOverdue = due !== null && due < today && status !== TicketStatus.DONE;

  function handleChange(value: string) {
    const next = value || null;
    setEditing(false);
    startTransition(async () => {
      await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: next }),
      });
      router.refresh();
    });
  }

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={dueDate ? dueDate.slice(0, 10) : ""}
        autoFocus
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={(e) => handleChange(e.target.value)}
        className="text-sm border rounded px-2 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Set due date"
      />
    );
  }

  if (!due) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        disabled={isPending}
      >
        Set due date
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Calendar className={`h-3.5 w-3.5 shrink-0 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
      <span className={`text-sm font-medium ${isOverdue ? "text-destructive" : ""}`}>
        {formatDate(due)}
      </span>
      {isOverdue && (
        <span className="flex items-center gap-0.5 text-xs text-destructive font-medium">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 ml-0.5"
        onClick={() => setEditing(true)}
        disabled={isPending}
        aria-label="Edit due date"
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}
