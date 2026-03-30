// SPEC: routing-rules.md
"use client";

import { useState } from "react";
import { Team } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface RoutingRuleRow {
  id: string;
  name: string;
  team: Team;
  keywords: string[];
  priority: number;
  isActive: boolean;
}

interface RoutingRuleDialogProps {
  mode: "create" | "edit";
  rule?: RoutingRuleRow;
  onSaved: (rule: RoutingRuleRow) => void;
  onClose: () => void;
}

const TEAMS: { value: Team; label: string }[] = [
  { value: Team.CONTENT, label: "Content" },
  { value: Team.DESIGN, label: "Design" },
  { value: Team.SEO, label: "SEO" },
  { value: Team.WEM, label: "WEM" },
  { value: Team.PAID_MEDIA, label: "Paid Media" },
  { value: Team.ANALYTICS, label: "Analytics" },
];

export function RoutingRuleDialog({ mode, rule, onSaved, onClose }: RoutingRuleDialogProps) {
  const [name, setName] = useState(rule?.name ?? "");
  const [team, setTeam] = useState<Team>(rule?.team ?? Team.CONTENT);
  const [keywordsRaw, setKeywordsRaw] = useState(rule?.keywords.join(", ") ?? "");
  const [priority, setPriority] = useState(rule?.priority ?? 10);
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const keywords = keywordsRaw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (keywords.length === 0) {
      setError("At least one keyword is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url =
        mode === "edit" ? `/api/routing-rules/${rule!.id}` : "/api/routing-rules";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), team, keywords, priority, isActive }),
      });

      const json = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Failed to save.");
        return;
      }

      // Normalise keywords from the API response (stored as JSON string)
      const saved = json as unknown as RoutingRuleRow & { keywords: string | string[] };
      const parsedKeywords =
        typeof saved.keywords === "string"
          ? (JSON.parse(saved.keywords) as string[])
          : saved.keywords;

      onSaved({ ...saved, keywords: parsedKeywords });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Routing Rule" : "Edit Routing Rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SEO Keywords Rule"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-team">Team</Label>
            <Select value={team} onValueChange={(v) => setTeam(v as Team)}>
              <SelectTrigger id="rule-team" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAMS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-keywords">Keywords</Label>
            <Textarea
              id="rule-keywords"
              value={keywordsRaw}
              onChange={(e) => setKeywordsRaw(e.target.value)}
              placeholder="seo, meta, ranking, backlinks"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rule-priority">Priority</Label>
              <Input
                id="rule-priority"
                type="number"
                min={1}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">1 = highest priority</p>
            </div>

            <div className="space-y-1.5">
              <Label>Active</Label>
              <div className="flex items-center h-8 gap-2">
                <button
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                    isActive ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span className="sr-only">Toggle active state</span>
                  <span
                    className={`pointer-events-none mt-0.5 ml-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-muted-foreground">{isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
