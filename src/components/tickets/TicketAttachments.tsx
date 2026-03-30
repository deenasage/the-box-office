// SPEC: brief-to-epic-workflow.md
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Trash2, Download } from "lucide-react";

interface AttachmentRecord {
  id: string;
  ticketId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: { id: string; name: string };
}

interface TicketAttachmentsProps {
  ticketId: string;
  initialAttachments: AttachmentRecord[];
  currentUserId: string;
  currentUserRole: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const MAX_FILES = 10;

export function TicketAttachments({
  ticketId,
  initialAttachments,
  currentUserId,
  currentUserRole,
}: TicketAttachmentsProps) {
  const [attachments, setAttachments] =
    useState<AttachmentRecord[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const atLimit = attachments.length >= MAX_FILES;

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      // Client-side limit check
      if (attachments.length + files.length > MAX_FILES) {
        setError(
          `Cannot upload — would exceed the ${MAX_FILES} file limit. Remove some attachments first.`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setUploading(true);
      setError(null);

      const uploaded: AttachmentRecord[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
            method: "POST",
            body: fd,
          });
          const json = (await res.json()) as { data?: AttachmentRecord; error?: string };
          if (!res.ok) {
            setError(json.error ?? `Upload failed for ${file.name}`);
            break;
          }
          if (json.data) uploaded.push(json.data);
        } catch {
          setError(`Network error uploading ${file.name}`);
          break;
        }
      }

      setAttachments((prev) => [...prev, ...uploaded]);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [attachments.length, ticketId]
  );

  const handleDelete = useCallback(
    async (attachment: AttachmentRecord) => {
      const confirmed = window.confirm(
        `Delete "${attachment.fileName}"? This cannot be undone.`
      );
      if (!confirmed) return;

      const res = await fetch(
        `/api/tickets/${ticketId}/attachments/${attachment.id}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      } else {
        try {
          const json = (await res.json()) as { error?: string };
          setError(json.error ?? "Delete failed.");
        } catch {
          setError("Delete failed.");
        }
      }
    },
    [ticketId]
  );

  const canDelete = (att: AttachmentRecord) =>
    att.uploadedBy.id === currentUserId || currentUserRole === "ADMIN";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            Attachments{attachments.length > 0 ? ` (${attachments.length}/${MAX_FILES})` : ""}
          </h3>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={atLimit || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-3 w-3" />
          {uploading ? "Uploading…" : "Attach files"}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.txt,.jpeg,.jpg,.png,.gif,.webp"
          onChange={(e) => void handleFileChange(e)}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
          {error}
        </p>
      )}

      {attachments.length === 0 && !uploading && (
        <p className="text-xs text-muted-foreground">No attachments yet.</p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/tickets/${ticketId}/attachments/${att.id}`}
                  download={att.fileName}
                  className="flex items-center gap-1.5 font-medium hover:text-primary hover:underline truncate"
                >
                  <Download className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{att.fileName}</span>
                </a>
                <p className="text-muted-foreground mt-0.5">
                  {formatBytes(att.sizeBytes)} · {formatDate(att.createdAt)} ·{" "}
                  {att.uploadedBy.name}
                </p>
              </div>

              {canDelete(att) && (
                <button
                  onClick={() => void handleDelete(att)}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete attachment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
