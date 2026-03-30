"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <h2 className="text-xl font-semibold mb-1">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        An error occurred while loading this page.
        {error.message ? ` ${error.message}` : ""}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => { window.location.href = "/"; }}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
