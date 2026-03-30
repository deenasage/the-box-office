// SPEC: portfolio-view.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { EpicFormDialog, EpicData } from "./EpicFormDialog";
import { useRouter } from "next/navigation";

interface EpicEditButtonProps {
  epic: EpicData;
}

export function EpicEditButton({ epic }: EpicEditButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSaved(_updated: EpicData) {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" />
        Edit Epic
      </Button>
      {open && (
        <EpicFormDialog
          epic={epic}
          onSaved={handleSaved}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
