// SPEC: design-improvements.md
// SPEC: jira-import.md
"use client";

import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Info, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PreviewRow {
  title: string;
  team: string;
  status: string;
  priority: string;
  size?: string;
  assignee?: string;
}

interface PreviewResult {
  rows: PreviewRow[];
  totalRows: number;
  duplicates: number;
  willImport: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

type Step = "idle" | "previewing" | "preview-ready" | "importing" | "done" | "error";

export default function JiraImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setStep(selected ? "idle" : "idle");
    setPreview(null);
    setResult(null);
    setApiError(null);
  }

  async function handlePreview() {
    if (!file) return;
    setStep("previewing");
    setApiError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/jira?preview=true", { method: "POST", body: formData });
      const json = (await res.json()) as { data?: PreviewResult; error?: string };
      if (!res.ok) {
        setApiError(json.error ?? "Preview failed");
        setStep("error");
        return;
      }
      setPreview(json.data!);
      setStep("preview-ready");
    } catch {
      setApiError("Network error — could not reach the server");
      setStep("error");
    }
  }

  async function handleImport() {
    if (!file) return;
    setStep("importing");
    setApiError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/jira", { method: "POST", body: formData });
      const json = (await res.json()) as { data?: ImportResult; error?: string };
      if (!res.ok) {
        setApiError(json.error ?? "Import failed");
        setStep("error");
        return;
      }
      setResult(json.data!);
      setStep("done");
    } catch {
      setApiError("Network error — could not reach the server");
      setStep("error");
    }
  }

  function handleReset() {
    setFile(null);
    setStep("idle");
    setPreview(null);
    setResult(null);
    setApiError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = step === "previewing" || step === "importing";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import from Jira</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a Jira CSV or XML export file. Preview what will be imported before committing.
        </p>
      </div>

      {/* Step 1 — File picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1 — Select export file</CardTitle>
          <CardDescription>
            Supports Jira&apos;s &ldquo;Export Excel CSV (all fields)&rdquo; and XML backup formats.
            Maximum file size: 10 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            htmlFor="jira-file"
            className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            {file ? (
              <div className="flex flex-col items-center gap-1.5">
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium">Click to choose a file</span>
                <span className="text-xs">.csv or .xml accepted</span>
              </div>
            )}
            <input
              id="jira-file"
              ref={inputRef}
              type="file"
              accept=".csv,.xml"
              className="sr-only"
              onChange={handleFileChange}
              disabled={busy}
            />
          </label>

          <div className="flex gap-2">
            <Button
              onClick={handlePreview}
              disabled={!file || busy || step === "done"}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              {step === "previewing" ? "Previewing…" : "Preview"}
            </Button>
            {(file || result || apiError) && (
              <Button variant="ghost" onClick={handleReset} disabled={busy}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — Preview results */}
      {(step === "preview-ready" || step === "importing" || step === "done") && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2 — Review &amp; Import</CardTitle>
            <CardDescription className="flex flex-wrap gap-3 pt-1">
              <span>
                <Badge variant="default" className="mr-1">{preview.willImport}</Badge>
                will be imported
              </span>
              {preview.duplicates > 0 && (
                <span>
                  <Badge variant="secondary" className="mr-1">{preview.duplicates}</Badge>
                  duplicates will be skipped
                </span>
              )}
              <span className="text-muted-foreground">({preview.totalRows} total rows parsed)</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.rows.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Title</th>
                        <th className="px-3 py-2 text-left font-medium">Team</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Priority</th>
                        <th className="px-3 py-2 text-left font-medium">Size</th>
                        <th className="px-3 py-2 text-left font-medium">Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, i) => (
                        <tr key={i} className="border-t hover:bg-muted/20">
                          <td className="px-3 py-1.5 max-w-xs truncate">{row.title}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{row.team}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{row.status}</td>
                          <td className="px-3 py-1.5">{row.priority}</td>
                          <td className="px-3 py-1.5">{row.size ?? "—"}</td>
                          <td className="px-3 py-1.5">{row.assignee ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No new tickets to import (all are duplicates or file is empty).
              </p>
            )}

            {step !== "done" && preview.willImport > 0 && (
              <Button onClick={handleImport} disabled={busy}>
                {step === "importing" ? "Importing…" : `Import ${preview.willImport} tickets`}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {apiError && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-sm">{apiError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Done */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Import complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <Badge variant="default" className="text-sm px-2.5 py-0.5">{result.imported}</Badge>
                <span className="text-sm text-muted-foreground">imported</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-sm px-2.5 py-0.5">{result.skipped}</Badge>
                  <span className="text-sm text-muted-foreground">skipped (duplicates / empty)</span>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  {result.errors.length} notice{result.errors.length !== 1 ? "s" : ""}
                </div>
                <ul className="space-y-1 max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-muted-foreground font-mono">{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-muted/30 border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">How to export from Jira</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1.5">
          <p>
            <strong>CSV:</strong> In your Jira board or backlog, click{" "}
            <strong>Export &rarr; Export Excel CSV (all fields)</strong>. The file will include
            columns like Summary, Description, Priority, Status, Assignee, Story Points, and Labels.
          </p>
          <p>
            <strong>XML:</strong> Use <strong>Export &rarr; Export XML</strong> (available from
            the issue search results page). The importer reads{" "}
            <code className="bg-muted px-1 rounded">&lt;item&gt;</code> elements inside the RSS channel.
          </p>
          <p>
            Assignees and labels are matched to existing records by name. Unmatched assignees are
            left blank; unmatched labels are skipped. Teams are assigned automatically via routing rules.
            Duplicate tickets (same title) are skipped automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
