// SPEC: auto-assign-v2.md
"use client";

/**
 * AutoAssignTrigger — minimal client component for the sprint detail page.
 *
 * The sprint detail page (`/sprints/[id]/page.tsx`) is a React Server Component.
 * It cannot hold `useState` for the modal open state. This thin client wrapper
 * holds that state and renders both the trigger button and the AutoAssignModal.
 *
 * Usage in a server component:
 *   <AutoAssignTrigger
 *     sprintId={sprint.id}
 *     sprintName={sprint.name}
 *     userRole={session?.user.role ?? "ADMIN"}
 *     userTeam={session?.user.team ?? null}
 *   />
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { AutoAssignModal } from "./AutoAssignModal";

interface AutoAssignTriggerProps {
  sprintId: string;
  sprintName: string;
  userRole?: string;
  userTeam?: string | null;
}

export function AutoAssignTrigger({
  sprintId,
  sprintName,
  userRole = "ADMIN",
  userTeam = null,
}: AutoAssignTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open auto-assign configuration for this sprint"
      >
        <Wand2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        Auto-assign
      </Button>

      <AutoAssignModal
        sprintId={sprintId}
        sprintName={sprintName}
        open={open}
        onClose={() => setOpen(false)}
        userRole={userRole}
        userTeam={userTeam}
      />
    </>
  );
}
