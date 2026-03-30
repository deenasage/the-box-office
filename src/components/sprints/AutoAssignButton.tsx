// SPEC: auto-assign-v2.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AutoAssignConfigSheet } from "./AutoAssignConfigSheet";
import { SprintPlanningModal } from "./SprintPlanningModal";
import { notify } from "@/lib/toast";
import { Wand2 } from "lucide-react";
import { AutoAssignConfig, PreviewResponseV2, ALL_TEAMS } from "./auto-assign-types";

interface AutoAssignButtonProps {
  sprintId: string;
  sprintName: string;
  userRole?: string;
  userTeam?: string | null;
}

export function AutoAssignButton({
  sprintId,
  sprintName,
  userRole = "ADMIN",
  userTeam = null,
}: AutoAssignButtonProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponseV2 | null>(null);

  async function handlePreviewReady(config: AutoAssignConfig) {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/auto-assign/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSprintId: sprintId,
          teamFilter: config.teams.length < ALL_TEAMS.length ? config.teams : undefined,
          ignoreCapacity: config.ignoreCapacity,
          includeStatuses: config.includeStatuses,
          prioritizeCarryover: config.prioritizeCarryover,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        notify.error(json.error ?? "Failed to generate preview");
        return;
      }

      const data = (await res.json()) as PreviewResponseV2;

      if (data.proposals.length === 0) {
        const skippedCount = data.skippedTickets?.length ?? 0;
        if (skippedCount > 0) {
          notify.info(
            `No sized tickets available to assign. ${skippedCount} ticket${skippedCount !== 1 ? "s" : ""} need sizing — click a ticket to set its size.`
          );
        } else {
          notify.info("No backlog tickets found for the selected teams.");
        }
        setConfigOpen(false);
        return;
      }

      setPreviewData(data);
      setConfigOpen(false);
      setModalOpen(true);
    } catch {
      notify.error("Failed to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="default"
              size="sm"
              onClick={() => setConfigOpen(true)}
              disabled={loading}
              aria-label="Auto-assign selected tickets to this sprint"
            />
          }
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="ml-1.5">Auto-assign selected tickets</span>
        </TooltipTrigger>
        <TooltipContent>
          Configure and run auto-assignment for this sprint.
        </TooltipContent>
      </Tooltip>

      <AutoAssignConfigSheet
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        sprintId={sprintId}
        sprintName={sprintName}
        userRole={userRole}
        userTeam={userTeam}
        onPreviewReady={handlePreviewReady}
        loading={loading}
      />

      {previewData && (
        <SprintPlanningModal
          key={
            previewData.proposals.length +
            "-" +
            (previewData.proposals[0]?.ticketId ?? "")
          }
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          previewData={previewData}
        />
      )}
    </>
  );
}
