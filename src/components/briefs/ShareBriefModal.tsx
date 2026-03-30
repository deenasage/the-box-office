// SPEC: brief-to-epic-workflow.md
// Phase 1 — Share token management UI
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Link2,
  Plus,
  XCircle,
  Loader2,
} from "lucide-react";
import { notify } from "@/lib/toast";

interface ShareToken {
  id: string;
  label: string | null;
  token?: string;
  revoked: boolean;
  createdAt: string;
  commentCount: number;
}

interface ShareBriefModalProps {
  briefId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Unused but exported for future use
export { formatBytes };

// ── CopyButton ─────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="ml-1.5">{copied ? "Copied" : "Copy link"}</span>
    </Button>
  );
}

// ── RevokeConfirm ──────────────────────────────────────────────────────────────

interface RevokeConfirmProps {
  tokenId: string;
  briefId: string;
  onRevoked: (tokenId: string) => void;
}

function RevokeConfirm({ tokenId, briefId, onRevoked }: RevokeConfirmProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRevoke() {
    setLoading(true);
    const res = await fetch(`/api/briefs/${briefId}/share/${tokenId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoked: true }),
    });
    setLoading(false);
    if (!res.ok) {
      notify.error("Failed to revoke link");
      return;
    }
    onRevoked(tokenId);
    setConfirming(false);
    notify.success("Link revoked");
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        <XCircle className="h-3.5 w-3.5 mr-1" />
        Revoke
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Revoke this link?</span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleRevoke}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, revoke"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}

// ── TokenRow ────────────────────────────────────────────────────────────────────

interface TokenRowProps {
  token: ShareToken;
  briefId: string;
  onRevoked: (tokenId: string) => void;
  onLabelSaved: (tokenId: string, label: string) => void;
}

function TokenRow({ token, briefId, onRevoked, onLabelSaved }: TokenRowProps) {
  const [label, setLabel] = useState(token.label ?? "");
  const shareUrl = token.token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/briefs/share/${token.token}`
    : null;

  async function handleLabelBlur() {
    const trimmed = label.trim();
    if (trimmed === (token.label ?? "")) return;
    const res = await fetch(`/api/briefs/${briefId}/share/${token.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: trimmed || null }),
    });
    if (res.ok) {
      onLabelSaved(token.id, trimmed);
    } else {
      notify.error("Failed to save label");
    }
  }

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        token.revoked ? "opacity-60 bg-muted/30" : "bg-background"
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">
            {token.label || "Unnamed link"}
          </span>
          {token.revoked && (
            <Badge variant="outline" className="text-destructive border-destructive/40 text-xs">
              Revoked
            </Badge>
          )}
          {token.commentCount > 0 && !token.revoked && (
            <Badge variant="secondary" className="text-xs">
              {token.commentCount} comment{token.commentCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDate(token.createdAt)}
        </span>
      </div>

      {/* Share URL */}
      {shareUrl && (
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={token.revoked ? "(revoked)" : shareUrl}
            className="text-xs font-mono h-7 bg-muted/50"
            disabled={token.revoked}
          />
          {!token.revoked && <CopyButton text={shareUrl} />}
        </div>
      )}

      {/* Label input */}
      {!token.revoked && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Label <span className="font-normal">(optional — e.g. "Sent to Acme team")</span>
          </Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            placeholder="Add a label…"
            className="h-7 text-sm"
          />
        </div>
      )}

      {/* Revoke */}
      {!token.revoked && (
        <div className="flex justify-end">
          <RevokeConfirm tokenId={token.id} briefId={briefId} onRevoked={onRevoked} />
        </div>
      )}
    </div>
  );
}

// ── ShareBriefModal ─────────────────────────────────────────────────────────────

export function ShareBriefModal({ briefId, open, onOpenChange }: ShareBriefModalProps) {
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/briefs/${briefId}/share`);
      if (!res.ok) {
        setFetchError("Failed to load share links");
        return;
      }
      const json = (await res.json()) as { data: ShareToken[] };
      setTokens(json.data);
    } catch {
      setFetchError("Failed to load share links");
    } finally {
      setLoading(false);
    }
  }, [briefId]);

  useEffect(() => {
    if (open) void fetchTokens();
  }, [open, fetchTokens]);

  async function handleGenerate() {
    setGenerating(true);
    const res = await fetch(`/api/briefs/${briefId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setGenerating(false);
    if (!res.ok) {
      notify.error("Failed to generate link");
      return;
    }
    const json = (await res.json()) as { data: ShareToken };
    // The POST returns the raw token value — prepend to list
    setTokens((prev) => [json.data, ...prev]);
  }

  function handleRevoked(tokenId: string) {
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, revoked: true } : t))
    );
  }

  function handleLabelSaved(tokenId: string, label: string) {
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, label: label || null } : t))
    );
  }

  const active = tokens.filter((t) => !t.revoked);
  const revoked = tokens.filter((t) => t.revoked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Share Brief
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this brief with stakeholders for review and feedback. Each link
            can be labelled, and revoked at any time.
          </p>

          {/* Generate new link */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate new link
          </Button>

          {/* Token list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : fetchError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {fetchError}
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active links
                  </p>
                  {active.map((t) => (
                    <TokenRow
                      key={t.id}
                      token={t}
                      briefId={briefId}
                      onRevoked={handleRevoked}
                      onLabelSaved={handleLabelSaved}
                    />
                  ))}
                </div>
              )}

              {revoked.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Revoked links
                  </p>
                  {revoked.map((t) => (
                    <TokenRow
                      key={t.id}
                      token={t}
                      briefId={briefId}
                      onRevoked={handleRevoked}
                      onLabelSaved={handleLabelSaved}
                    />
                  ))}
                </div>
              )}

              {tokens.length === 0 && (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No share links yet. Click &quot;Generate new link&quot; to create one.
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
