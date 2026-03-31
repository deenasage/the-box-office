// SPEC: gtm-brief-generator.md
import { GtmNewBriefForm } from "@/components/briefs/GtmNewBriefForm";

export default function NewBriefPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create a Brief</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select a brief type, upload your document, and Claude will extract all structured fields.
        </p>
      </div>
      <GtmNewBriefForm />
    </div>
  );
}
