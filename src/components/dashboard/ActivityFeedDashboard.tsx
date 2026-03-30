// SPEC: tickets.md
// SPEC: design-improvements.md
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";

interface ActivityItem {
  id: string;
  ticketId: string;
  ticketTitle: string;
  from: string | null;
  to: string;
  changedAt: string;
  changedBy: { name: string };
}

interface ActivityFeedDashboardProps {
  items: ActivityItem[];
}

export function ActivityFeedDashboard({ items }: ActivityFeedDashboardProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground">
          Status changes will appear here as your team moves tickets through the workflow.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="py-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/tickets/${item.ticketId}`}
              className="text-sm font-medium hover:underline line-clamp-1"
            >
              {item.ticketTitle}
            </Link>
            <p className="text-sm text-muted-foreground mt-0.5">
              {item.changedBy.name} moved{" "}
              {item.from && (
                <>
                  from <span className="font-medium">{item.from}</span>{" "}
                </>
              )}
              <ArrowRight className="inline h-3 w-3" />{" "}
              <span className="font-medium">{item.to}</span>
            </p>
          </div>
          <time
            dateTime={item.changedAt}
            className="text-sm text-muted-foreground whitespace-nowrap pt-0.5"
          >
            {new Date(item.changedAt).toLocaleDateString()}
          </time>
        </li>
      ))}
    </ul>
  );
}
