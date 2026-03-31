// SPEC: ai-brief.md
// Client component for the Brief Drafts tab — handles delete and share-link actions.
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Link2, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { notify } from "@/lib/toast";
import { BriefStatus } from "@prisma/client";
import { STATUS_BADGE_STYLES } from "@/lib/constants";

interface BriefDraft {
  id: string;
  title: string;
  status: BriefStatus;
  createdAt: Date | string;
  creator: { name: string };
  _count: { shareTokens: number };
}

interface BriefDraftsClientProps {
  initialBriefs: BriefDraft[];
  activeStatus: string | undefined;
}

const FILTER_OPTIONS = [
  { value: "ALL",    label: "All" },
  { value: "DRAFT",  label: "Draft" },
  { value: "REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
] as const;

/** Returns the display label for a brief's status badge. */
function getBriefStatusLabel(status: BriefStatus, shareTokenCount: number): string {
  if (status === BriefStatus.REVIEW) {
    return shareTokenCount > 0 ? "Under Review" : "Review";
  }
  if (status === BriefStatus.APPROVED) return "Approved";
  if (status === BriefStatus.DRAFT) return "Draft";
  if (status === BriefStatus.GENERATING) return "Generating";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Returns Tailwind badge classes for a brief's status. */
function getBriefStatusStyle(status: BriefStatus): string {
  return STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES.DRAFT;
}

export function BriefDraftsClient({ initialBriefs, activeStatus }: BriefDraftsClientProps) {
  const [briefs, setBriefs] = useState<BriefDraft[]>(initialBriefs);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (briefId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(briefId);
    try {
      const res = await fetch(`/api/briefs/${briefId}`, { method: "DELETE" });
      if (!res.ok) {
        notify.error("Failed to delete brief");
        return;
      }
      setBriefs((prev) => prev.filter((b) => b.id !== briefId));
      notify.success("Brief deleted");
    } catch {
      notify.error("Failed to delete brief");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleShare = useCallback(async (briefId: string) => {
    setSharingId(briefId);
    try {
      // Create a new share token
      const res = await fetch(`/api/briefs/${briefId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        notify.error("Failed to generate share link");
        return;
      }
      const json = (await res.json()) as { data: { token: string } };
      const shareUrl = `${window.location.origin}/briefs/share/${json.data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      notify.success("Link copied to clipboard");
      // Update local share token count so badge updates
      setBriefs((prev) =>
        prev.map((b) =>
          b.id === briefId
            ? { ...b, _count: { shareTokens: b._count.shareTokens + 1 } }
            : b
        )
      );
    } catch {
      notify.error("Failed to copy link");
    } finally {
      setSharingId(null);
    }
  }, []);

  if (briefs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">No briefs found</p>
          <p className="text-sm text-muted-foreground">
            {activeStatus && activeStatus !== "ALL"
              ? "No briefs match this filter."
              : "Briefs you create will appear here."}
          </p>
        </div>
        <Link href="/briefs/new">
          <Button size="sm">Create a brief</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {briefs.map((brief) => {
        const statusLabel = getBriefStatusLabel(brief.status, brief._count.shareTokens);
        const statusStyle = getBriefStatusStyle(brief.status);
        const isDeleting = deletingId === brief.id;
        const isSharing = sharingId === brief.id;

        return (
          <Card
            key={brief.id}
            className="hover:shadow-md hover:ring-1 hover:ring-primary/20 transition-all"
          >
            <CardContent className="py-3 flex items-center gap-3">
              {/* Title + meta — links to brief detail */}
              <Link href={`/briefs/${brief.id}`} className="flex-1 min-w-0 group">
                <p className="font-medium truncate group-hover:text-primary transition-colors">
                  {brief.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {brief.creator.name} &middot; {formatDate(brief.createdAt)}
                </p>
              </Link>

              {/* Status badge */}
              <Badge variant="outline" className={statusStyle}>
                {statusLabel}
              </Badge>

              {/* Share link button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => void handleShare(brief.id)}
                disabled={isSharing || isDeleting}
                aria-label="Copy share link"
                title="Copy share link"
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
              </Button>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => void handleDelete(brief.id, brief.title)}
                disabled={isDeleting || isSharing}
                aria-label="Delete brief"
                title="Delete brief"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/** Filter pills for the Brief Drafts tab — server-rendered links. */
export function BriefDraftsFilterPills({ activeStatus }: { activeStatus: string | undefined }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FILTER_OPTIONS.map(({ value, label }) => {
        const href =
          value === "ALL"
            ? "/submit-request?tab=drafts"
            : `/submit-request?tab=drafts&status=${value}`;
        const isActive = value === "ALL" ? !activeStatus || activeStatus === "ALL" : activeStatus === value;
        return (
          <a
            key={value}
            href={href}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
