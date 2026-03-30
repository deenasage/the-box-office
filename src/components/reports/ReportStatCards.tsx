// SPEC: reports.md
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ReportStatCard {
  label: string;
  value: number | string;
  sub?: string;
}

interface ReportStatCardsProps {
  stats: ReportStatCard[];
}

export function ReportStatCards({ stats }: ReportStatCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-medium">{s.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
