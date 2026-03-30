// SPEC: design-improvements.md
// SPEC: portfolio-view.md
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PortfolioSummaryPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">Leadership overview of delivery health</p>
        </div>
        <Link href="/portfolio">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Portfolio
          </Button>
        </Link>
      </div>

      <PortfolioSummary />
    </div>
  );
}
