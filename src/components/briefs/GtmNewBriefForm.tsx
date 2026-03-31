// SPEC: gtm-brief-generator.md
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Loader2,
  Megaphone,
  RefreshCw,
  AlertCircle,
  UploadCloud,
  X,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/toast";
import { formatBytes } from "@/lib/utils";

// ── Brief type selector ───────────────────────────────────────────────────────

const BRIEF_TYPES = [
  {
    id: "GTM",
    label: "GTM",
    description: "Go-to-market brief with 40+ structured fields extracted by Claude",
    icon: TrendingUp,
    enabled: true,
  },
  {
    id: "CAMPAIGN_LAUNCH",
    label: "Campaign Launch",
    description: "Brief for launching a new marketing campaign",
    icon: Megaphone,
    enabled: false,
  },
  {
    id: "CAMPAIGN_UPDATE",
    label: "Campaign Update",
    description: "Brief for updating or extending an existing campaign",
    icon: RefreshCw,
    enabled: false,
  },
  {
    id: "PROBLEM_STATEMENT",
    label: "Problem Statement",
    description: "Brief focused on defining a problem and proposed solution",
    icon: Lightbulb,
    enabled: false,
  },
] as const;

interface BriefTypeSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

function BriefTypeSelector({ selected, onSelect }: BriefTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {BRIEF_TYPES.map(({ id, label, description, icon: Icon, enabled }) => (
        <button
          key={id}
          type="button"
          disabled={!enabled}
          onClick={() => enabled && onSelect(id)}
          aria-pressed={selected === id}
          className={[
            "relative text-left rounded-lg border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !enabled
              ? "opacity-50 cursor-not-allowed bg-muted/30"
              : selected === id
              ? "border-green-500 bg-green-50/60 dark:bg-green-900/10 ring-1 ring-green-500"
              : "border-border hover:border-foreground/30 hover:bg-muted/30 cursor-pointer",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "mt-0.5 rounded-md p-1.5",
                selected === id && enabled
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{label}</p>
                {!enabled && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Coming soon
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── File upload area ──────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

interface FileUploadAreaProps {
  file: File | null;
  onFile: (f: File | null) => void;
  disabled: boolean;
  error: string | null;
}

function FileUploadArea({ file, onFile, disabled, error }: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(f: File): string | null {
    if (!ALLOWED_TYPES.has(f.type)) return "Only PDF and Word (.docx) files are supported.";
    if (f.size > MAX_FILE_SIZE) return "File exceeds the 10 MB limit.";
    return null;
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    const err = validate(f);
    if (err) { notify.error(err); return; }
    onFile(f);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <FileText className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onFile(null)}
          aria-label="Remove file"
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload file — click or drag and drop"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click(); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); if (!disabled) handleFiles(e.dataTransfer.files); }}
      className={[
        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
        disabled
          ? "cursor-not-allowed opacity-50 border-border"
          : "cursor-pointer border-border hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        error ? "border-destructive/50 bg-destructive/5" : "",
      ].join(" ")}
    >
      <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">Drag &amp; drop or click to upload</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          PDF or Word (.docx) &middot; max 10 MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_EXTENSIONS.join(",")}
        onChange={(e) => handleFiles(e.target.files)}
        aria-hidden="true"
      />
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function GtmNewBriefForm() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("GTM");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setGenerating(true);
    setFileError(null);

    try {
      // Step 1: Create the brief
      const createRes = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled GTM Brief", briefType: "GTM", rawInput: "{}" }),
      });
      if (!createRes.ok) {
        const data = (await createRes.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create brief");
      }
      const brief = (await createRes.json()) as { id: string };

      // Step 2: Upload attachment
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch(`/api/briefs/${brief.id}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!uploadRes.ok) {
        const data = (await uploadRes.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to upload file");
      }

      // Step 3: Trigger generation — fire and redirect immediately.
      // The brief detail page polls for status, so the user sees progress there.
      fetch(`/api/briefs/${brief.id}/generate`, { method: "POST" }).catch(() => {
        // Errors will surface as DRAFT status on the detail page
      });

      router.push(`/briefs/${brief.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      notify.error(msg);
      setFileError(msg);
      setGenerating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1 */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Step 1 &mdash; Select brief type</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose the type of brief you want to generate
          </p>
        </div>
        <BriefTypeSelector selected={selectedType} onSelect={setSelectedType} />
      </div>

      {/* Step 2 */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold">Step 2 &mdash; Upload your document</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Claude will extract all structured fields from your document
          </p>
        </div>
        <FileUploadArea
          file={file}
          onFile={setFile}
          disabled={generating}
          error={fileError}
        />
        {fileError && (
          <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {fileError}
          </p>
        )}
      </div>

      {/* Generate button */}
      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          disabled={!file || generating}
          className="w-full sm:w-auto"
          aria-describedby={generating ? "generating-hint" : undefined}
        >
          {generating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Generate Brief
        </Button>
        {generating && (
          <p id="generating-hint" className="text-xs text-muted-foreground" role="status">
            Generating your brief, this may take 30&ndash;60 seconds&hellip;
          </p>
        )}
      </div>
    </form>
  );
}
