// SPEC: guest-intake.md
"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitRequestShareBar() {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/intake`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Share intake form</p>
        <p className="text-xs text-muted-foreground truncate">
          Send the public link to external stakeholders who don&apos;t have app access.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}
