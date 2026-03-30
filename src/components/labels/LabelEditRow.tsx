// SPEC: labels.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

export const SWATCHES = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
  "#78716c", "#64748b",
];

interface LabelEditRowProps {
  label?: { name: string; color: string };
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}

export function LabelEditRow({ label, onSave, onCancel }: LabelEditRowProps) {
  const defaultColor = label?.color ?? SWATCHES[0];
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState(SWATCHES.includes(defaultColor) ? defaultColor : SWATCHES[0]);

  const activeColor = color;

  return (
    <tr className="bg-muted/30">
      <td className="px-4 py-2" colSpan={2}>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="h-4 w-4 rounded-full border shrink-0"
            style={{ backgroundColor: activeColor }}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label name"
            className="h-7 text-sm w-40"
            aria-label="Label name"
          />
          <div className="flex items-center gap-1 flex-wrap max-w-xs">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`Color ${s}`}
                onClick={() => { setColor(s); }}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  activeColor === s ? "border-foreground scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: s }}
              />
            ))}
          </div>
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={!name.trim()}
            onClick={() => onSave(name.trim(), activeColor)}
            aria-label="Save label"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onCancel}
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
