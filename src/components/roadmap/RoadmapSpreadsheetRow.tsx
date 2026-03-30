// SPEC: roadmap.md
// SPEC: design-improvements.md
"use client";

import { useState, useRef } from "react";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoadmapItemStatus } from "@prisma/client";

export type RoadmapItemRow = {
  id: string;
  tier: string | null;
  category: string | null;
  initiative: string | null;
  region: string | null;
  title: string;
  titleManuallyEdited?: boolean;
  ownerId: string | null;
  owner: { id: string; name: string; team: string | null } | null;
  status: RoadmapItemStatus;
  period: string;
  notes: string | null;
  sortOrder: number;
};

type User = { id: string; name: string };

// Modern translucent pill pattern: bg-*/10 text-*-700 dark:text-*-300 ring-1 ring-inset ring-*/20
const STATUS_STYLES: Record<RoadmapItemStatus, string> = {
  NOT_STARTED:   "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20",
  IN_PROGRESS:   "bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20",
  DONE:          "bg-green-500/10 text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-500/20",
  CARRIED_OVER:  "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20",
  NOT_COMMITTED: "bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-inset ring-orange-500/20",
  CANCELLED:     "bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20",
};

const STATUS_LABELS: Record<RoadmapItemStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  CARRIED_OVER: "Carried Over",
  NOT_COMMITTED: "Not Committed",
  CANCELLED: "Cancelled",
};

type Props = {
  item: RoadmapItemRow;
  users: User[];
  onPatch: (id: string, patch: Partial<RoadmapItemRow> & { titleManuallyEdited?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

type EditCell = "tier" | "category" | "initiative" | "region" | "title" | "notes" | null;

export function RoadmapSpreadsheetRow({ item, users, onPatch, onDelete, onMoveUp, onMoveDown }: Props) {
  const [editCell, setEditCell] = useState<EditCell>(null);
  const [draft, setDraft] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(cell: EditCell, value: string) {
    setEditCell(cell);
    setDraft(value ?? "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function commitEdit() {
    if (!editCell) return;
    const patch: Partial<RoadmapItemRow> & { titleManuallyEdited?: boolean } = {
      [editCell]: draft || null,
    };
    // Mark as manually edited so syncRoadmapItem won't overwrite the title
    if (editCell === "title" && draft.trim()) {
      patch.titleManuallyEdited = true;
    }
    await onPatch(item.id, patch);
    setEditCell(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditCell(null);
  }

  function textCell(cell: EditCell, value: string | null) {
    if (editCell === cell) {
      return (
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs px-1"
        />
      );
    }
    return (
      <button
        type="button"
        className="cursor-pointer hover:bg-muted/50 px-1 rounded text-xs w-full text-left min-h-6 leading-6 truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => startEdit(cell, value ?? "")}
        title={value ?? "Click to edit"}
        aria-label={`Edit ${String(cell)}: ${value ?? "empty"}`}
      >
        {value ?? <span className="text-muted-foreground italic">—</span>}
      </button>
    );
  }

  return (
    <tr className="group border-b hover:bg-muted/20 transition-colors">
      {/* Up/Down reorder buttons */}
      <td className="px-1 py-2 w-16">
        <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            aria-label="Move row up"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            aria-label="Move row down"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </td>
      <td className="px-3 py-2 w-24">{textCell("tier", item.tier)}</td>
      <td className="px-3 py-2 w-28">{textCell("category", item.category)}</td>
      <td className="px-3 py-2 w-32">{textCell("initiative", item.initiative)}</td>
      <td className="px-3 py-2 w-20">{textCell("region", item.region)}</td>
      <td className="px-3 py-2 min-w-50">{textCell("title", item.title)}</td>
      <td className="px-3 py-2 w-36">
        <Select
          value={item.ownerId ?? "none"}
          onValueChange={(v) => onPatch(item.id, { ownerId: v === "none" ? null : (v ?? null) })}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {item.ownerId ? (users.find((u) => u.id === item.ownerId)?.name ?? item.ownerId) : "Unassigned"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2 w-36">
        <Select
          value={item.status}
          onValueChange={(v) => v && onPatch(item.id, { status: v as RoadmapItemStatus })}
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </SelectTrigger>
          <SelectContent>
            {(Object.values(RoadmapItemStatus) as RoadmapItemStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                <Badge className={`text-xs ${STATUS_STYLES[s]}`}>{STATUS_LABELS[s]}</Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2 w-8 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}
