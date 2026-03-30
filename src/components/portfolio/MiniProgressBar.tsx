// SPEC: portfolio-view.md
interface MiniProgressBarProps {
  done: number;
  total: number;
  pct: number;
}

export function MiniProgressBar({ done, total, pct }: MiniProgressBarProps) {
  if (total === 0) {
    return (
      <span className="text-xs text-muted-foreground">0 tickets</span>
    );
  }
  return (
    <div className="space-y-1 min-w-[80px]">
      <div className="w-full bg-muted rounded-full h-1.5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground tabular-nums">{done}/{total} done</p>
    </div>
  );
}
