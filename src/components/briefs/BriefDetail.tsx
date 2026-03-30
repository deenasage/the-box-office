// SPEC: ai-brief.md
// SPEC: brief-to-epic-workflow.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { AlertTriangle, Share2, CheckCircle2, Loader2, MessageSquare, ListChecks } from "lucide-react";
import { BriefStatus, UserRole } from "@prisma/client";
import type { ClarificationItem } from "@/lib/ai/brief-generator";
import { SprintSuggestionPanel } from "@/components/briefs/SprintSuggestionPanel";
import { DependencyDetectPanel } from "@/components/briefs/DependencyDetectPanel";
import { parseJsonSafe } from "@/lib/utils";
import { BriefHeader } from "@/components/briefs/BriefHeader";
import { BriefStatusBanner } from "@/components/briefs/BriefStatusBanner";
import { BriefFields } from "@/components/briefs/BriefFields";
import { BriefClarifications } from "@/components/briefs/BriefClarifications";
import { BriefAttachments } from "@/components/briefs/BriefAttachments";
import { BriefLinkedTickets } from "@/components/briefs/BriefLinkedTickets";
import { BriefComments } from "@/components/briefs/BriefComments";
import { ShareBriefModal } from "@/components/briefs/ShareBriefModal";
import { TeamSplitReviewModal } from "@/components/briefs/TeamSplitReviewModal";
import type { SplitSuggestion } from "@/components/briefs/TeamSplitReviewModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Brief } from "@/components/briefs/brief-types";
export type { Brief, Attachment, BriefTicket } from "@/components/briefs/brief-types";

const SHAREABLE_STATUSES: BriefStatus[] = [
  BriefStatus.REVIEW,
  BriefStatus.APPROVED,
  BriefStatus.FINALIZED,
];

const APPROVABLE_STATUSES: BriefStatus[] = [
  BriefStatus.REVIEW,
  BriefStatus.FINALIZED,
];

interface Props {
  brief: Brief;
  canEdit: boolean;
  userRole?: string;
}

// ── Composition shell ─────────────────────────────────────────────────────────

export function BriefDetail({ brief: initial, canEdit, userRole }: Props) {
  const router = useRouter();
  const [brief, setBrief] = useState(initial);
  const [clarifications, setClarifications] = useState<ClarificationItem[]>(
    parseJsonSafe<ClarificationItem[]>(initial.clarifications, [])
  );
  const [finalizing, setFinalizing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitLoading, setSplitLoading] = useState(false);
  const [splitSuggestion, setSplitSuggestion] = useState<SplitSuggestion | null>(null);
  const [confirming, setConfirming] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdminOrLead =
    userRole === UserRole.ADMIN || userRole === UserRole.TEAM_LEAD;

  // Fetch comment count for tab badge (only for shareable statuses)
  useEffect(() => {
    if (!SHAREABLE_STATUSES.includes(brief.status)) return;
    void (async () => {
      const res = await fetch(`/api/briefs/${brief.id}/comments`);
      if (!res.ok) return;
      const json = (await res.json()) as { data: { resolved: boolean }[] };
      setCommentCount(json.data.filter((c) => !c.resolved).length);
    })();
  }, [brief.id, brief.status]);

  // Poll while Claude is generating
  useEffect(() => {
    if (brief.status !== BriefStatus.GENERATING) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/briefs/${brief.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as Brief;
      setBrief(data);
      setClarifications(
        parseJsonSafe<ClarificationItem[]>(data.clarifications, [])
      );
      if (data.status !== BriefStatus.GENERATING) {
        clearInterval(pollRef.current!);
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [brief.id, brief.status]);

  async function saveSection(field: string, value: string | string[]) {
    const res = await fetch(`/api/briefs/${brief.id}/sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) { notify.error("Failed to save"); return; }
    setBrief((await res.json()) as Brief);
  }

  async function handleRefine() {
    setRefining(true);
    const res = await fetch(`/api/briefs/${brief.id}/refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clarifications }),
    });
    setRefining(false);
    if (!res.ok) { notify.error("Refinement failed — please try again."); return; }
    setBrief((b) => ({ ...b, status: BriefStatus.GENERATING }));
  }

  async function handleFinalize() {
    setFinalizing(true);
    const res = await fetch(`/api/briefs/${brief.id}/finalize`, { method: "POST" });
    setFinalizing(false);
    if (!res.ok) {
      const data = (await res.json()) as { error: string };
      notify.error(data.error ?? "Finalization failed.");
      return;
    }
    notify.success("Brief finalized!");
    router.refresh();
    setBrief((b) => ({ ...b, status: BriefStatus.FINALIZED }));
  }

  async function handleApprove() {
    setApproving(true);
    const res = await fetch(`/api/briefs/${brief.id}/approve`, { method: "POST" });
    setApproving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error: string };
      notify.error(data.error ?? "Approval failed.");
      return;
    }
    notify.success("Brief approved!");
    setApproveOpen(false);
    router.refresh();
    setBrief((b) => ({ ...b, status: BriefStatus.APPROVED }));
  }

  async function handleCreateTickets() {
    setSplitSuggestion(null);
    setSplitOpen(true);
    setSplitLoading(true);
    const res = await fetch(`/api/briefs/${brief.id}/suggest-split`, { method: "POST" });
    setSplitLoading(false);
    if (!res.ok) {
      const data = (await res.json()) as { error: string };
      notify.error(data.error ?? "Failed to generate ticket split.");
      setSplitOpen(false);
      return;
    }
    const json = (await res.json()) as { data: SplitSuggestion };
    setSplitSuggestion(json.data);
  }

  async function handleConfirmSplit(edited: SplitSuggestion) {
    setConfirming(true);
    const res = await fetch(`/api/briefs/${brief.id}/confirm-split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edited),
    });
    setConfirming(false);
    if (!res.ok) {
      const data = (await res.json()) as { error: string };
      notify.error(data.error ?? "Failed to create tickets.");
      return;
    }
    const json = (await res.json()) as { data: { epicId: string; ticketIds: string[]; message: string } };
    notify.success(json.data.message);
    setSplitOpen(false);
    router.refresh();
    setBrief((b) => ({ ...b, status: BriefStatus.FINALIZED }));
  }

  function updateClarification(id: string, answer: string) {
    setClarifications((cs) =>
      cs.map((c) =>
        c.id === id ? { ...c, answer, answered: answer.trim().length > 0 } : c
      )
    );
  }

  const isEditable = canEdit && brief.status === BriefStatus.REVIEW;
  const rawInput = parseJsonSafe<{ truncated?: boolean }>(brief.rawInput, {});
  const hasNewAnswers = clarifications.some((c) => c.answered && c.answer);
  const allAnswered =
    clarifications.length === 0 || clarifications.every((c) => c.answered);

  const showShareButton = SHAREABLE_STATUSES.includes(brief.status);
  const showApproveButton =
    isAdminOrLead && APPROVABLE_STATUSES.includes(brief.status);
  const showCreateTickets =
    isAdminOrLead && brief.status === BriefStatus.APPROVED && !brief.epic;
  const showComments = SHAREABLE_STATUSES.includes(brief.status);

  // ── Action buttons row ───────────────────────────────────────────────────────
  const ActionButtons = () => (
    <div className="flex items-center gap-2 flex-wrap">
      {showShareButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          Share
        </Button>
      )}
      {showApproveButton && (
        <Button
          type="button"
          size="sm"
          onClick={() => setApproveOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Approve
        </Button>
      )}
      {showCreateTickets && (
        <Button
          type="button"
          size="sm"
          onClick={handleCreateTickets}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <ListChecks className="h-3.5 w-3.5 mr-1.5" />
          Create Tickets
        </Button>
      )}
    </div>
  );

  // ── Brief content tab ────────────────────────────────────────────────────────
  const BriefContent = () => (
    <div className="space-y-6">
      {/* Truncation warning */}
      {rawInput.truncated && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Uploaded document content was truncated — Claude is working from
          partial file text.
        </div>
      )}

      <BriefStatusBanner
        briefId={brief.id}
        status={brief.status}
        canEdit={canEdit}
        onStatusChange={(next) => setBrief((b) => ({ ...b, status: next }))}
      />

      {/* Brief field sections */}
      {(brief.status === BriefStatus.REVIEW ||
        brief.status === BriefStatus.FINALIZED ||
        brief.status === BriefStatus.APPROVED) && (
        <BriefFields
          brief={brief}
          isEditable={isEditable}
          onSaveSection={saveSection}
        />
      )}

      {/* Clarifications Q&A */}
      {brief.status === BriefStatus.REVIEW && (
        <BriefClarifications
          clarifications={clarifications}
          hasNewAnswers={hasNewAnswers}
          allAnswered={allAnswered}
          refining={refining}
          finalizing={finalizing}
          onUpdateClarification={updateClarification}
          onRefine={handleRefine}
          onFinalize={handleFinalize}
        />
      )}

      {/* Sprint suggestions — after tickets exist */}
      {brief.status === BriefStatus.FINALIZED && (
        <SprintSuggestionPanel
          briefId={brief.id}
          ticketCount={brief.tickets.length}
          userRole={(userRole ?? UserRole.MEMBER) as UserRole}
        />
      )}

      {/* Dependency detection */}
      {brief.status === BriefStatus.FINALIZED &&
        brief.tickets.length > 0 && (
          <DependencyDetectPanel
            briefId={brief.id}
            ticketCount={brief.tickets.length}
            userRole={userRole ?? UserRole.MEMBER}
          />
        )}

      <BriefLinkedTickets tickets={brief.tickets} epicId={brief.epic?.id} />

      <BriefAttachments briefId={brief.id} attachments={brief.attachments} />

      {/* Token usage — admin only */}
      {userRole === "ADMIN" && (brief.aiPromptTokens ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground/80">
          AI usage: {brief.aiPromptTokens} prompt · {brief.aiOutputTokens}{" "}
          output tokens
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header + action buttons */}
      <div className="space-y-3">
        <BriefHeader brief={brief} />
        <ActionButtons />
      </div>

      {/* Tabs — only show tabs when comments are relevant */}
      {showComments ? (
        <Tabs defaultValue="brief">
          <TabsList>
            <TabsTrigger value="brief">Brief</TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
              {commentCount !== null && commentCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                  {commentCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="brief" className="mt-6">
            <BriefContent />
          </TabsContent>
          <TabsContent value="comments" className="mt-6">
            <BriefComments briefId={brief.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <BriefContent />
      )}

      {/* Team Split Modal */}
      <TeamSplitReviewModal
        briefId={brief.id}
        open={splitOpen}
        onOpenChange={setSplitOpen}
        suggestion={splitSuggestion}
        loading={splitLoading}
        onConfirm={handleConfirmSplit}
        confirming={confirming}
      />

      {/* Share Modal */}
      <ShareBriefModal
        briefId={brief.id}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve this brief?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mark this brief as approved? This will lock it for editing.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={approving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              Yes, approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
