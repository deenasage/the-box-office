// SPEC: portfolio-view.md
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EPIC_STATUS_STYLES, EPIC_STATUS_LABELS } from "./portfolio-types";

interface EpicStatusBadgeProps {
  status: string;
  className?: string;
}

export function EpicStatusBadge({ status, className }: EpicStatusBadgeProps) {
  const styles = EPIC_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
  const label = EPIC_STATUS_LABELS[status] ?? status;
  return (
    <Badge variant="outline" className={cn(styles, "font-medium text-xs", className)}>
      {label}
    </Badge>
  );
}
