// SPEC: design-improvements.md
// SPEC: smart-tickets.md
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { SizeBadge } from "@/components/tickets/SizeBadge";
import { Team, TicketSize, TicketStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/constants";

export interface TicketCardRow {
  id: string;
  title: string;
  description: string | null;
  team: Team;
  size: TicketSize | null;
  status: TicketStatus;
}

interface GenerateTicketCardProps {
  ticket: TicketCardRow;
}

export function GenerateTicketCard({ ticket }: GenerateTicketCardProps) {
  return (
    <Link href={`/tickets/${ticket.id}`} className="hover:no-underline">
      <Card className="hover:shadow-md hover:ring-1 hover:ring-primary/20 transition-all cursor-pointer">
        <CardContent className="py-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium leading-snug">{ticket.title}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <TeamBadge team={ticket.team} />
              <SizeBadge size={ticket.size} />
            </div>
          </div>
          {ticket.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>
          )}
          <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
