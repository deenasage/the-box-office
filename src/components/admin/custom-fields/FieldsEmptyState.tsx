// SPEC: custom-fields.md
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, PlusIcon } from "lucide-react";

interface Props {
  onAdd: () => void;
}

export function FieldsEmptyState({ onAdd }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-3">
      <SlidersHorizontal className="size-10 text-muted-foreground/30" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium">No custom fields yet</p>
        <p className="text-sm text-muted-foreground">
          Add fields to extend ticket intake forms with team-specific data.
        </p>
      </div>
      <Button variant="outline" onClick={onAdd}>
        <PlusIcon className="size-4" />
        Add your first field
      </Button>
    </div>
  );
}
