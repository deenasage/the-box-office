// SPEC: portfolio-view.md
// Stats summary row shown above the portfolio table

interface PortfolioStatsBarProps {
  total: number;
  inProgress: number;
  completed: number;
}

export function PortfolioStatsBar({ total, inProgress, completed }: PortfolioStatsBarProps) {
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      <span className="font-semibold text-foreground">{total}</span>{" "}
      project{total !== 1 ? "s" : ""}
      {" · "}
      <span className="font-semibold text-yellow-600 dark:text-yellow-400">{inProgress}</span>{" "}
      in progress
      {" · "}
      <span className="font-semibold text-[#008146] dark:text-[#00D93A]">{completed}</span>{" "}
      completed
    </p>
  );
}
