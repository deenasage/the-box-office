// SPEC: sprints.md
"use client";

import { useState, useTransition } from "react";
import { TicketSize, Team } from "@prisma/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Inbox } from "lucide-react";

interface RefinementTicket {
  id: string;
  title: string;
  team: Team;
  size: TicketSize | null;
  priority: number;
  assigneeId: string | null;
  assignee: { id: string; name: string } | null;
}

interface RefinementUser {
  id: string;
  name: string;
  team: Team | null;
}

interface Props {
  sprintId: string;
  tickets: RefinementTicket[];
  users: RefinementUser[];
}

const SIZES: TicketSize[] = ["XS", "S", "M", "L", "XL", "XXL"];

export function RefinementTab({ tickets: initialTickets, users }: Props) {
  const [tickets, setTickets] = useState(initialTickets);
  const [, startTransition] = useTransition();

  function patchTicket(id: string, patch: Record<string, unknown>) {
    startTransition(async () => {
      await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
    });
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-3 mx-auto mb-4 w-fit">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">All tickets are sized and assigned</p>
        <p className="text-xs text-muted-foreground mt-1">Nothing to refine right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Ticket</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-20">Team</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-28">Size</th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-40">Assignee</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2 font-medium truncate max-w-xs">{ticket.title}</td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="text-xs">{ticket.team}</Badge>
              </td>
              <td className="px-3 py-2">
                <Select
                  value={ticket.size ?? "__none__"}
                  onValueChange={(v) => patchTicket(ticket.id, { size: v === "__none__" ? null : v })}
                >
                  <SelectTrigger className="h-7 text-xs w-24">
                    <SelectValue placeholder="No size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No size</SelectItem>
                    {SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2">
                <Select
                  value={ticket.assigneeId ?? "__none__"}
                  onValueChange={(v) => patchTicket(ticket.id, { assigneeId: v === "__none__" ? null : v })}
                >
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
