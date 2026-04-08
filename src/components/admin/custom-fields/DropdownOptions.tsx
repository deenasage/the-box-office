// SPEC: custom-fields.md
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusIcon, XIcon } from "lucide-react";

interface Props {
  options: string[];
  onAdd: (opt: string) => void;
  onRemove: (opt: string) => void;
}

export function DropdownOptions({ options, onAdd, onRemove }: Props) {
  const [draft, setDraft] = useState("");

  function commit() {
    const val = draft.trim();
    if (!val) return;
    onAdd(val);
    setDraft("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Options</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add option… (press Enter)"
          onKeyDown={handleKey}
          aria-label="New dropdown option"
        />
        <Button type="button" variant="outline" size="icon" onClick={commit} aria-label="Add option">
          <PlusIcon className="size-4" />
        </Button>
      </div>
      {options.length > 0 ? (
        <ul className="flex flex-col gap-1" role="list" aria-label="Dropdown options">
          {options.map((opt) => (
            <li
              key={opt}
              className="flex items-center justify-between rounded-md bg-muted px-2.5 py-1 text-sm"
            >
              <span>{opt}</span>
              <button
                type="button"
                onClick={() => onRemove(opt)}
                className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove option ${opt}`}
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Add at least one option.</p>
      )}
    </div>
  );
}
