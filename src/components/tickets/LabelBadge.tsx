// SPEC: labels.md
// SPEC: design-improvements.md

interface LabelBadgeProps {
  label: { name: string; color: string };
}

/**
 * Returns black (#000000) or white (#ffffff) text color that provides readable
 * contrast against the given hex background color, using perceived-brightness
 * weighting (ITU-R BT.601).
 */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function LabelBadge({ label }: LabelBadgeProps) {
  const textColor = getContrastColor(label.color);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: label.color, color: textColor }}
    >
      {label.name}
    </span>
  );
}
