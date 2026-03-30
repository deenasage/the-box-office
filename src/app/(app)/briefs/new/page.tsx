// SPEC: ai-brief.md
import { NewBriefForm } from "@/components/briefs/NewBriefForm";

export default function NewBriefPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Brief</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Describe your project and optionally upload supporting documents. Claude will generate a structured brief.
        </p>
      </div>
      <NewBriefForm />
    </div>
  );
}
