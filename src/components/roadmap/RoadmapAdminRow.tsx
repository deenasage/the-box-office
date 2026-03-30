// SPEC: roadmap.md
"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { RoadmapItemStatus } from "@prisma/client";
import { useState, useRef } from "react";

type User = { id: string; name: string };

export type AdminItemRow = {
  id: string;
  category: string | null;
  initiative: string | null;
  region: string | null;
  title: string;
  ownerId: string | null;
  status: RoadmapItemStatus;
  period: string;
};

const STATUS_LABELS: Record<RoadmapItemStatus, string> = {
  NOT_STARTED:   "Not Started",
  IN_PROGRESS:   "In Progress",
  DONE:          "Done",
  CARRIED_OVER:  "Carried Over",
  NOT_COMMITTED: "Not Committed",
  CANCELLED:     "Cancelled",
};

type EditableText = "category" | "initiative" | "region" | "period";

interface Props {
  item: AdminItemRow;
  users: User[];
  onPatch: (id: string, patch: Partial<AdminItemRow>) => Promise<void>;
}

export function RoadmapAdminRow({ item, users, onPatch }: Props) {
  const [editCell, setEditCell] = useState<EditableText | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(cell: EditableText, value: string) {
    setEditCell(cell);
    setDraft(value ?? "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function commitEdit() {
    if (!editCell) return;
    await onPatch(item.id, { [editCell]: draft || null });
    setEditCell(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void commitEdit();
    if (e.key === "Escape") setEditCell(null);
  }

  function textCell(cell: EditableText, value: string | null) {
    if (editCell === cell) {
      return (
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commitEdit()}
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
        aria-label={`Edit ${cell}: ${value ?? "empty"}`}
      >
        {value ?? <span className="text-muted-foreground italic">—</span>}
      </button>
    );
  }

  return (
    <tr className="border-b hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2 w-28">{textCell("category", item.category)}</td>
      <td className="px-3 py-2 w-32">{textCell("initiative", item.initiative)}</td>
      <td className="px-3 py-2 w-20">{textCell("region", item.region)}</td>
      <td className="px-3 py-2 min-w-[200px] text-xs text-foreground truncate max-w-xs" title={item.title}>
        {item.title}
      </td>
      <td className="px-3 py-2 w-36">
        <Select
          value={item.ownerId ?? "none"}
          onValueChange={(v) =>
            void onPatch(item.id, { ownerId: v === "none" ? null : (v ?? null) })
          }
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {item.ownerId
                ? (users.find((u) => u.id === item.ownerId)?.name ?? item.ownerId)
                : "Unassigned"}
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
          onValueChange={(v) =>
            v && void onPatch(item.id, { status: v as RoadmapItemStatus })
          }
        >
          <SelectTrigger className="h-7 text-xs w-full">
            <span data-slot="select-value" className="flex flex-1 text-left truncate text-xs">
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </SelectTrigger>
          <SelectContent>
            {(Object.values(RoadmapItemStatus) as RoadmapItemStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2 w-28">{textCell("period", item.period)}</td>
    </tr>
  );
}
