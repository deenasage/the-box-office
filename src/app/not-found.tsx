"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              404
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>

          <Button onClick={() => router.push("/")} className="mt-2">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
