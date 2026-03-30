// SPEC: sprint-scrum.md
// NOTE: "Complete Sprint" functionality was superseded by SprintCloseButton which uses
// the proper POST /api/sprints/[id]/close route with carryover suggestion support.
// SprintActionButtons now only handles: Activate (inactive sprints) and Delete (admin).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DeleteSprintDialog } from "./DeleteSprintDialog";
import { UserRole } from "@prisma/client";

interface SprintActionButtonsProps {
  sprintId: string;
  sprintName: string;
  isActive: boolean;
  ticketCount: number;
  userRole: UserRole;
}

export function SprintActionButtons({
  sprintId,
  sprintName,
  isActive,
  ticketCount,
  userRole,
}: SprintActionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // Active sprints: closing is handled exclusively by SprintCloseButton
  // to ensure carryover suggestions are created via POST /api/sprints/[id]/close.
  if (isActive) return null;

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleActivate} disabled={loading}>
        {loading ? "Activating…" : "Activate Sprint"}
      </Button>
      {userRole === UserRole.ADMIN && (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete Sprint
        </Button>
      )}
      {showDeleteDialog && (
        <DeleteSprintDialog
          sprintId={sprintId}
          sprintName={sprintName}
          ticketCount={ticketCount}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}
