// SPEC: labels.md
import { X } from "lucide-react";
import { hexLuminance } from "@/lib/utils";

interface LabelChipProps {
  label: { id: string; name: string; color: string };
  onRemove?: () => void;
}

export function LabelChip({ label, onRemove }: LabelChipProps) {
  const lum = hexLuminance(label.color);
  // On a near-white tinted background, use the label color as text for dark
  // labels, or dark gray for very light colors where the label color itself
  // would wash out against the tinted bg.
  const textColor = lum > 0.4 ? "#374151" : label.color;

  const clean = label.color.replace("#", "");
  const r = parseInt(clean.slice(0, 2) || "6b", 16);
  const g = parseInt(clean.slice(2, 4) || "72", 16);
  const b = parseInt(clean.slice(4, 6) || "80", 16);
  const bgStyle = `rgba(${r},${g},${b},0.15)`;
  const borderStyle = `rgba(${r},${g},${b},0.4)`;

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none"
      style={{
        backgroundColor: bgStyle,
        border: `1px solid ${borderStyle}`,
        color: textColor,
      }}
    >
      <span className="truncate max-w-30">{label.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove label ${label.name}`}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors shrink-0"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
