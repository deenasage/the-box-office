// SPEC: portfolio-view.md
// SPEC: design-improvements.md (typography/a11y pass)
import { cn } from "@/lib/utils";

const STAGES = ["Intake", "Brief", "Planning", "In Progress", "Done"] as const;

const STATUS_TO_STAGE: Record<string, number> = {
  INTAKE:      0,
  IN_BRIEF:    1,
  BRIEFED:     1,
  IN_PLANNING: 2,
  IN_PROGRESS: 3,
  DONE:        4,
};

interface LifecycleProgressBarProps {
  status: string;
}

export function LifecycleProgressBar({ status }: LifecycleProgressBarProps) {
  if (status === "ON_HOLD") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        This initiative is on hold.
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-500">
        This initiative has been cancelled.
      </div>
    );
  }

  const currentStage = STATUS_TO_STAGE[status] ?? 0;

  return (
    <div className="space-y-2">
      {/* Each step gets flex-1 so they space evenly; dots are centered within their column */}
      <div className="flex items-start" role="list" aria-label="Initiative lifecycle stages">
        {STAGES.map((stage, i) => {
          const isPast = i < currentStage;
          const isCurrent = i === currentStage;
          const isFuture = i > currentStage;

          return (
            <div key={stage} className="flex flex-col items-center flex-1" role="listitem">
              {/* Dot row with connector lines on each side */}
              <div className="flex items-center w-full">
                <div className={cn("h-0.5 flex-1", i === 0 ? "invisible" : isPast || isCurrent ? "bg-primary" : "bg-muted")} />
                <div
                  className={cn(
                    "h-3 w-3 rounded-full border-2 transition-all shrink-0",
                    isCurrent && "border-primary bg-primary scale-125",
                    isPast  && "border-primary bg-primary opacity-60",
                    isFuture && "border-muted-foreground/30 bg-background"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                />
                <div className={cn("h-0.5 flex-1", i === STAGES.length - 1 ? "invisible" : isPast ? "bg-primary" : "bg-muted")} />
              </div>
              {/* Label below dot */}
              <span
                className={cn(
                  "mt-1.5 text-[11px] text-center leading-tight",
                  isCurrent && "font-semibold text-foreground",
                  isPast  && "text-muted-foreground",
                  isFuture && "text-muted-foreground/80"
                )}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
