// SPEC: tickets.md
// SPEC: design-improvements.md
"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketStatusBadge } from "@/components/dashboard/TicketStatusBadge";
import { DueDatePill } from "@/components/dashboard/DueDatePill";
import { KanbanTicketPanel } from "@/components/kanban/KanbanTicketPanel";
import type { TicketStatus, TicketSize, Team } from "@prisma/client";

interface MyTicket {
  id: string;
  title: string;
  status: TicketStatus;
  dueDate: string | null;
  team: Team;
  size: TicketSize | null;
}

interface MyTicketsCardProps {
  tickets: MyTicket[];
}

export function MyTicketsCard({ tickets: initialTickets }: MyTicketsCardProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleStatusChange(newStatus: TicketStatus) {
    if (!selectedId) return;
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, status: newStatus } : t))
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              My Tickets
            </CardTitle>
            <Link
              href="/my-work"
              className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No tickets assigned to you.</p>
            </div>
          ) : (
            <ul aria-label="Your assigned tickets">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(ticket.id)}
                    className="flex w-full items-center gap-2 py-2.5 -mx-4 px-4 hover:bg-muted/40 transition-colors text-left"
                    aria-label={`Open ticket: ${ticket.title}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{ticket.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <TicketStatusBadge status={ticket.status} />
                      {ticket.dueDate && <DueDatePill dueDate={ticket.dueDate} />}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <KanbanTicketPanel
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}
