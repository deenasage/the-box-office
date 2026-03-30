// SPEC: ai-brief.md
import { FileText, Paperclip } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | string;
}

interface BriefAttachmentsProps {
  briefId: string;
  attachments: Attachment[];
}

export function BriefAttachments({
  briefId,
  attachments,
}: BriefAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        Attachments ({attachments.length})
      </h2>
      <div className="rounded-lg border divide-y">
        {attachments.map((a) => (
          <a
            key={a.id}
            href={`/api/briefs/${briefId}/attachments/${a.id}`}
            download={a.fileName}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-sm"
          >
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate">{a.fileName}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatBytes(a.sizeBytes)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
