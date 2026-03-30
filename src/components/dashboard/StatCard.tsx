// SPEC: tickets.md
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
  icon?: ReactNode;
  /** Extra Tailwind classes applied to the top border accent */
  accentClass?: string;
  /** If true, value renders in red when > 0 */
  alertIfPositive?: boolean;
  /** If provided, the entire card becomes a link to this href */
  href?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accentClass = "border-t-primary",
  alertIfPositive = false,
  href,
}: StatCardProps) {
  const valueColor =
    alertIfPositive && value > 0 ? "text-red-600 dark:text-red-400" : "";

  const card = (
    <Card
      className={cn(
        "border-t-[3px]",
        accentClass,
        href && "cursor-pointer transition-colors hover:bg-muted/40 hover:shadow-sm"
      )}
    >
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p
          className={cn("text-3xl font-bold tabular-nums leading-none", valueColor)}
          aria-label={`${label}: ${value}`}
        >
          {value}
        </p>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        {card}
      </Link>
    );
  }

  return card;
}
