// SPEC: portfolio-view.md
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { EpicStatusBadge } from "./EpicStatusBadge";
import { MiniProgressBar } from "./MiniProgressBar";
import { formatDate } from "@/lib/utils";
import { PortfolioListItem } from "./portfolio-types";
import { ExternalLink } from "lucide-react";
import { Team } from "@prisma/client";

interface PortfolioTableProps {
  items: PortfolioListItem[];
}

export function PortfolioTable({ items }: PortfolioTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-lg">
        <p className="text-sm font-medium">No projects yet</p>
        <p className="text-xs mt-1">Try adjusting your filters, or create a new epic.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Initiative</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Teams</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Progress</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Brief</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Sprints</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Timeline</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <PortfolioRow key={item.epicId} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PortfolioRow({ item }: { item: PortfolioListItem }) {
  const router = useRouter();
  const visibleTeams = item.teams.slice(0, 3) as Team[];
  const extraTeams = item.teams.length - 3;
  const visibleSprints = item.sprints.slice(0, 3);
  const extraSprints = item.sprints.length - 3;

  const timeline =
    item.epicStartDate && item.epicEndDate
      ? `${formatDate(item.epicStartDate)} – ${formatDate(item.epicEndDate)}`
      : item.epicStartDate
      ? `From ${formatDate(item.epicStartDate)}`
      : "Not scheduled";

  return (
    <tr
      className="hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => router.push(`/portfolio/${item.epicId}`)}
    >
      {/* Initiative */}
      <td className="px-4 py-3 max-w-55">
        <Link href={`/portfolio/${item.epicId}`} className="font-medium hover:underline text-foreground line-clamp-2">
          {item.epicName}
        </Link>
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <EpicStatusBadge status={item.epicStatus} />
      </td>

      {/* Teams */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 items-center">
          {visibleTeams.map((t) => (
            <TeamBadge key={t} team={t} className="text-xs py-0" />
          ))}
          {extraTeams > 0 && (
            <span className="text-xs text-muted-foreground">+{extraTeams} more</span>
          )}
          {item.teams.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>

      {/* Progress */}
      <td className="px-4 py-3">
        <MiniProgressBar
          done={item.ticketCounts.done}
          total={item.ticketCounts.total}
          pct={item.completionPct}
        />
      </td>

      {/* Brief */}
      <td className="px-4 py-3 whitespace-nowrap">
        {item.activeBriefStatus ? (
          <Badge variant="outline" className="text-xs">{item.activeBriefStatus}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>

      {/* Sprints */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 items-center">
          {visibleSprints.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs font-normal">{s}</Badge>
          ))}
          {extraSprints > 0 && (
            <span className="text-xs text-muted-foreground">+{extraSprints} more</span>
          )}
          {item.sprints.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>

      {/* Timeline */}
      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
        {timeline}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <Link href={`/portfolio/${item.epicId}`} aria-label={`View ${item.epicName}`}>
          <Button variant="ghost" size="sm" className="h-7 px-2">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </td>
    </tr>
  );
}
