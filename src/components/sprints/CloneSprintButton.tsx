// SPEC: sprints.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";

interface CloneSprintButtonProps {
  sprintId: string;
  /** Render as an icon-only button (for list view) vs labelled button (for detail view) */
  variant?: "icon" | "labelled";
}

export function CloneSprintButton({
  sprintId,
  variant = "labelled",
}: CloneSprintButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClone() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sprints/${sprintId}/clone`, {
        method: "POST",
      });
      if (res.ok) {
        const json = (await res.json()) as { data: { id: string } };
        router.push(`/sprints/${json.data.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClone}
        disabled={loading}
        aria-label="Clone sprint"
        title="Clone sprint"
        className="h-7 w-7"
      >
        <CopyIcon className="h-3.5 w-3.5" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClone}
      disabled={loading}
      aria-label="Clone sprint"
    >
      <CopyIcon className="h-3.5 w-3.5 mr-1.5" aria-hidden />
      {loading ? "Cloning…" : "Clone Sprint"}
    </Button>
  );
}
