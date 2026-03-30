// SPEC: tickets.md
// SPEC: design-improvements.md
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DueDatePill } from "@/components/dashboard/DueDatePill";
import type { TicketStatus } from "@prisma/client";

interface UpcomingTicket {
  id: string;
  title: string;
  dueDate: string | null;
  status: TicketStatus;
  assignee: { name: string } | null;
}

interface UpcomingDueDatesCardProps {
  tickets: UpcomingTicket[];
}

export function UpcomingDueDatesCard({ tickets }: UpcomingDueDatesCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Upcoming Due Dates
          <Badge variant="secondary" className="ml-auto text-xs">
            Next 14 days
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nothing due in the next 14 days.</p>
          </div>
        ) : (
          <ul aria-label="Tickets due soon">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center gap-2 py-2.5 -mx-4 px-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{ticket.title}</p>
                    {ticket.assignee && (
                      <p className="text-sm text-muted-foreground truncate">
                        {ticket.assignee.name}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {ticket.dueDate && <DueDatePill dueDate={ticket.dueDate} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
