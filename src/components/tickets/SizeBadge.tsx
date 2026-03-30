// SPEC: tickets.md
import { Badge } from "@/components/ui/badge";
import { TicketSize } from "@prisma/client";
import { SIZE_HOURS } from "@/lib/utils";

interface SizeBadgeProps {
  size: TicketSize | null;
}

export function SizeBadge({ size }: SizeBadgeProps) {
  if (!size) {
    return (
      <Badge variant="outline" className="text-muted-foreground text-xs">
        Unsized
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs font-mono">
      {size} · {SIZE_HOURS[size]}h
    </Badge>
  );
}
