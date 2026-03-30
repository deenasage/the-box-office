// SPEC: auto-assign-v2.md
"use client";

/**
 * AutoAssignModal — self-contained flow component.
 *
 * Accepts `open` / `onClose` from a parent so any entry point (sprint detail,
 * backlog, capacity page) can control visibility while this component owns the
 * internal config → preview → planning → done state machine.
 *
 * Step 1: AutoAssignConfigSheet (right-side Sheet)
 * Step 2: SprintPlanningModal (full-screen Dialog)
 *
 * The v1 AutoAssignButton managed its own open state via a button. This
 * component separates that concern so any parent can trigger the flow.
 */

import { useState } from "react";
import { AutoAssignConfigSheet } from "./AutoAssignConfigSheet";
import { SprintPlanningModal } from "./SprintPlanningModal";
import { notify } from "@/lib/toast";
import { AutoAssignConfig, PreviewResponseV2, ALL_TEAMS } from "./auto-assign-types";

export interface AutoAssignModalProps {
  sprintId: string;
  sprintName: string;
  open: boolean;
  onClose: () => void;
  /** Role of the current user — used to lock team-lead to their own team */
  userRole?: string;
  /** Team of the current user (null for admins with no team lock) */
  userTeam?: string | null;
}

type ModalStep = "config" | "planning" | "idle";

export function AutoAssignModal({
  sprintId,
  sprintName,
  open,
  onClose,
  userRole = "ADMIN",
  userTeam = null,
}: AutoAssignModalProps) {
  const [step, setStep] = useState<ModalStep>("config");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponseV2 | null>(null);

  // When the parent closes the modal from outside, reset internal state
  function handleClose() {
    setStep("config");
    setPreviewData(null);
    setLoading(false);
    onClose();
  }

  async function handlePreviewReady(config: AutoAssignConfig) {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/auto-assign/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSprintId: sprintId,
          // Only send teamFilter when the user has restricted to fewer than all teams.
          teamFilter:
            config.teams.length < ALL_TEAMS.length ? config.teams : undefined,
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
        // Close the config sheet but stay closed (not open planning modal)
        handleClose();
        return;
      }

      setPreviewData(data);
      setStep("planning");
    } catch {
      notify.error("Failed to reach the server");
    } finally {
      setLoading(false);
    }
  }

  function handlePlanningClose() {
    setStep("config");
    setPreviewData(null);
    onClose();
  }

  return (
    <>
      {/* Step 1: Config sheet — visible when open and not yet in planning step */}
      <AutoAssignConfigSheet
        open={open && step === "config"}
        onClose={handleClose}
        sprintId={sprintId}
        sprintName={sprintName}
        userRole={userRole}
        userTeam={userTeam}
        onPreviewReady={handlePreviewReady}
        loading={loading}
      />

      {/* Step 2: Full-screen planning modal — visible after preview returns proposals */}
      {previewData && (
        <SprintPlanningModal
          // Key on ticketId of first proposal so re-runs fully reinitialise state
          key={`${previewData.proposals.length}-${previewData.proposals[0]?.ticketId ?? ""}`}
          open={step === "planning"}
          onClose={handlePlanningClose}
          previewData={previewData}
        />
      )}
    </>
  );
}
