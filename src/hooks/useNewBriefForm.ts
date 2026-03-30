// SPEC: ai-brief.md
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";

const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/html",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "message/rfc822",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

export interface PendingFile {
  file: File;
  error?: string;
}

export { MAX_FILES };

export function useNewBriefForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [context, setContext] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    const next: PendingFile[] = [...files];
    for (const file of arr) {
      if (next.length >= MAX_FILES) break;
      let error: string | undefined;
      if (!ALLOWED_TYPES.has(file.type)) error = "Unsupported file type";
      else if (file.size > MAX_FILE_SIZE) error = "Exceeds 10 MB limit";
      next.push({ file, error });
    }
    setFiles(next);
  }

  function removeFile(idx: number) {
    setFiles((f) => f.filter((_, i) => i !== idx));
  }

  function buildRawInput() {
    return JSON.stringify({
      textFields: {
        "Project Title": title,
        "Project Description": description,
        ...(launchDate ? { "Target Launch Date": launchDate } : {}),
        ...(context ? { "Additional Context": context } : {}),
      },
      fileNames: files.filter((f) => !f.error).map((f) => f.file.name),
    });
  }

  async function uploadFiles(briefId: string) {
    for (const { file, error } of files) {
      if (error) continue;
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/briefs/${briefId}/attachments`, { method: "POST", body: fd });
    }
  }

  async function save(andGenerate: boolean) {
    if (!title.trim()) { notify.error("Project title is required."); return; }
    if (!description.trim()) { notify.error("Project description is required."); return; }

    if (andGenerate) setGenerating(true); else setSaving(true);

    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), rawInput: buildRawInput() }),
      });
      if (!res.ok) throw new Error("Failed to create brief");
      const brief = await res.json() as { id: string };

      await uploadFiles(brief.id);

      if (andGenerate) {
        const genRes = await fetch(`/api/briefs/${brief.id}/generate`, { method: "POST" });
        if (!genRes.ok) {
          notify.error("Brief saved but generation failed — you can retry on the brief page.");
        }
      } else {
        notify.success("Draft saved");
      }

      router.push(`/briefs/${brief.id}`);
    } catch {
      notify.error("Something went wrong. Please try again.");
      setSaving(false);
      setGenerating(false);
    }
  }

  const busy = saving || generating;

  return {
    // field values
    title,
    setTitle,
    description,
    setDescription,
    launchDate,
    setLaunchDate,
    context,
    setContext,
    // file handling
    files,
    fileRef,
    addFiles,
    removeFile,
    // submit
    save,
    // status
    saving,
    generating,
    busy,
  };
}
