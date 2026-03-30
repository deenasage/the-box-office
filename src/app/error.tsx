"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. You can try again or go back to the
              dashboard.
            </p>
            {error.message && (
              <p className="text-xs text-muted-foreground font-mono mt-2 break-words">
                {error.message}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => { window.location.href = "/"; }}>
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
