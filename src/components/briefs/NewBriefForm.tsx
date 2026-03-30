// SPEC: ai-brief.md
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip, X, FileText, AlertCircle } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useNewBriefForm, MAX_FILES } from "@/hooks/useNewBriefForm";

export function NewBriefForm() {
  const {
    title, setTitle,
    description, setDescription,
    launchDate, setLaunchDate,
    context, setContext,
    files, fileRef,
    addFiles, removeFile,
    save,
    saving, generating, busy,
  } = useNewBriefForm();

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save(false); }}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="title">Project Title <span className="text-destructive">*</span></Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Spring Campaign Landing Page"
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Project Description <span className="text-destructive">*</span></Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the project goals, context, and any requirements you know of..."
          rows={5}
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="launchDate">Target Launch Date</Label>
        <Input
          id="launchDate"
          type="date"
          value={launchDate}
          onChange={(e) => setLaunchDate(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="context">Additional Context</Label>
        <Textarea
          id="context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Stakeholders, constraints, references, background..."
          rows={3}
          disabled={busy}
        />
      </div>

      {/* File upload */}
      <div className="space-y-2">
        <Label>Supporting Documents</Label>
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => !busy && fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) addFiles(e.dataTransfer.files);
          }}
        >
          <Paperclip className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag &amp; drop or click to upload
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            PDF, DOCX, TXT, HTML, EML · max 10 MB · up to {MAX_FILES} files
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.docx,.txt,.html,.eml"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((f, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md border ${
                  f.error ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"
                }`}
              >
                {f.error ? (
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="flex-1 truncate">{f.file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {f.error ?? formatBytes(f.file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="outline" disabled={busy}>
          {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Save Draft
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={() => save(true)}
        >
          {generating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          Save &amp; Generate Brief
        </Button>
      </div>
    </form>
  );
}
