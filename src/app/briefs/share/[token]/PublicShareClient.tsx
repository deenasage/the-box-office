// SPEC: brief-to-epic-workflow.md
// Phase 1 — Public share client — fetches brief and renders feedback form
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { parseJsonSafe } from "@/lib/utils";

// ── Types matching API response ────────────────────────────────────────────────

interface PublicAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

interface PublicBrief {
  id: string;
  title: string;
  objective: string | null;
  targetAudience: string | null;
  timeline: string | null;
  deliverables: string | null;
  dependencies: string | null;
  requiredTeams: string | null;
  successMetrics: string | null;
  attachments: PublicAttachment[];
  creator: { id: string; name: string };
}

interface PublicComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface ApiData {
  brief: PublicBrief;
  comments: PublicComment[];
  shareTokenId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Section renderer ───────────────────────────────────────────────────────────

function BriefSection({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ListSection({ label, rawJson }: { label: string; rawJson: string | null | undefined }) {
  const items = parseJsonSafe<string[]>(rawJson ?? null, []);
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="list-disc list-inside space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Feedback form ──────────────────────────────────────────────────────────────

interface FeedbackFormProps {
  token: string;
}

function FeedbackForm({ token }: FeedbackFormProps) {
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!authorName.trim() || !body.trim()) {
      setError("Name and comment are required.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/briefs/share/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim() || undefined,
        body: body.trim(),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("Failed to submit feedback. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <p className="text-sm font-medium text-green-800">
          Thanks for your feedback! The team will review it shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="authorName">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="authorName"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="authorEmail">
            Email <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="authorEmail"
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">
          Comment <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your thoughts, questions, or concerns…"
          rows={4}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
        Submit feedback
      </Button>
    </form>
  );
}

// ── PublicShareClient ──────────────────────────────────────────────────────────

interface Props {
  token: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "revoked" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "ok"; data: ApiData };

export function PublicShareClient({ token }: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/briefs/share/${token}`);
      if (res.status === 410 || res.status === 404) {
        setState({ status: res.status === 410 ? "revoked" : "not_found" });
        return;
      }
      if (!res.ok) {
        setState({ status: "error" });
        return;
      }
      const json = (await res.json()) as { data: ApiData };
      setState({ status: "ok", data: json.data });
    })();
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.status === "revoked") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center space-y-2">
        <AlertTriangle className="h-8 w-8 mx-auto text-destructive/60" />
        <h2 className="text-lg font-semibold">This link has been revoked</h2>
        <p className="text-sm text-muted-foreground">
          The person who shared this brief has revoked access. Please contact
          them directly for the latest version.
        </p>
      </div>
    );
  }

  if (state.status === "not_found") {
    return (
      <div className="rounded-lg border border-dashed px-6 py-10 text-center space-y-2">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">Link not found</h2>
        <p className="text-sm text-muted-foreground">
          This review link doesn&apos;t exist or has expired.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center space-y-2">
        <AlertTriangle className="h-8 w-8 mx-auto text-destructive/60" />
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          Unable to load this brief. Please try again later.
        </p>
      </div>
    );
  }

  const { brief, comments } = state.data;
  const requiredTeams = parseJsonSafe<string[]>(brief.requiredTeams, []);
  // Sort comments most-recent first for display
  const sortedComments = [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-8">
      {/* Brief header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{brief.title}</h1>
        <p className="text-sm text-muted-foreground">
          Shared by {brief.creator.name} · for review
        </p>
      </div>

      {/* Brief content */}
      <div className="rounded-lg border divide-y text-sm">
        {brief.objective && (
          <div className="px-4 py-3">
            <BriefSection label="Objective" value={brief.objective} />
          </div>
        )}
        {brief.targetAudience && (
          <div className="px-4 py-3">
            <BriefSection label="Target Audience" value={brief.targetAudience} />
          </div>
        )}
        {brief.timeline && (
          <div className="px-4 py-3">
            <BriefSection label="Timeline" value={brief.timeline} />
          </div>
        )}
        {brief.deliverables && (
          <div className="px-4 py-3">
            <ListSection label="Deliverables" rawJson={brief.deliverables} />
          </div>
        )}
        {brief.dependencies && (
          <div className="px-4 py-3">
            <ListSection label="Dependencies" rawJson={brief.dependencies} />
          </div>
        )}
        {brief.successMetrics && (
          <div className="px-4 py-3">
            <ListSection label="Success Metrics" rawJson={brief.successMetrics} />
          </div>
        )}
        {requiredTeams.length > 0 && (
          <div className="px-4 py-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Required Teams
            </p>
            <div className="flex flex-wrap gap-1.5">
              {requiredTeams.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attachments — listed without download links */}
      {brief.attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Attachments
          </p>
          <ul className="divide-y rounded-lg border text-sm">
            {brief.attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate font-medium">{a.fileName}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatBytes(a.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Leave feedback */}
      <div className="space-y-4">
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold">Leave feedback</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your comments will be shared with the team.
          </p>
        </div>
        <FeedbackForm token={token} />
      </div>

      {/* Existing comments (read-only, most recent first) */}
      {sortedComments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Feedback from others ({sortedComments.length})
          </h3>
          {sortedComments.map((c) => (
            <div key={c.id} className="rounded-lg border bg-muted/30 px-3 py-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{c.authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(c.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pt-4">
        Powered by <span className="font-medium">The Box Office</span>
      </p>
    </div>
  );
}
