// SPEC: form-builder.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Copy, Trash2, CheckCircle } from "lucide-react";

// ── New Template Dialog ───────────────────────────────────────────────────────

export function NewTemplateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/form-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined }),
    });
    if (res.ok) {
      const tmpl = await res.json();
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/admin/forms/${tmpl.id}`);
    } else {
      setError("Failed to create template. Please try again.");
    }
    setSaving(false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> New Template
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setName(""); setDescription(""); setError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Form Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="nt-name">Name *</Label>
              <Input
                id="nt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Content Request Form"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-desc">Description</Label>
              <Textarea
                id="nt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description…"
                rows={2}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="w-full"
            >
              {saving ? "Creating…" : "Create Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Per-row action buttons ────────────────────────────────────────────────────

interface TemplateRowActionsProps {
  id: string;
  name: string;
  isActive: boolean;
}

export function TemplateRowActions({ id, name, isActive }: TemplateRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleActivate() {
    setBusy(true);
    await fetch(`/api/form-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    router.refresh();
    setBusy(false);
  }

  async function handleDuplicate() {
    setBusy(true);
    const res = await fetch(`/api/form-templates/${id}/duplicate`, {
      method: "POST",
    });
    if (res.ok) {
      const copy = await res.json();
      router.push(`/admin/forms/${copy.id}`);
    }
    setBusy(false);
  }

  async function handleDelete() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/form-templates/${id}`, { method: "DELETE" });
    if (res.status === 409) {
      setError("Cannot delete — this template has tickets submitted against it.");
      setBusy(false);
      return;
    }
    setDeleteOpen(false);
    router.refresh();
    setBusy(false);
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {!isActive && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={handleActivate}
            aria-label={`Activate template ${name}`}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activate
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={handleDuplicate}
          aria-label={`Duplicate template ${name}`}
        >
          <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          disabled={busy}
          onClick={() => setDeleteOpen(true)}
          aria-label={`Delete template ${name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!o) { setDeleteOpen(false); setError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm">
              Are you sure you want to delete{" "}
              <strong>{name}</strong>? This cannot be undone.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={handleDelete}
              >
                {busy ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
