// SPEC: skillsets.md
// SPEC: design-improvements.md
import { cn } from "@/lib/utils";

interface SkillsetBadgeProps {
  name: string;
  /** Hex color stored on the Skillset record (e.g. "#7c3aed") */
  color?: string;
  className?: string;
  /** Render a smaller variant for inline ticket-card usage */
  size?: "sm" | "md";
}

/**
 * Colored badge for displaying a skillset name.
 * Uses the skillset's own `color` hex for the background tint and border,
 * falling back to a neutral purple when no color is supplied.
 * Mirrors the visual language of TeamBadge — tinted background, matching border, legible text.
 */
export function SkillsetBadge({
  name,
  color = "#7c3aed",
  className,
  size = "md",
}: SkillsetBadgeProps) {
  // 15% opacity tint background, 40% opacity border — same ratio as TeamBadge Tailwind equivalents.
  // Text stays at full color saturation for sufficient contrast on the light tint.
  const style: React.CSSProperties = {
    backgroundColor: `${color}26`, // ~15% opacity — lifted from ~9% for better visual weight
    borderColor: `${color}66`,    // ~40% opacity — slightly stronger border to match TeamBadge
    color,
  };

  return (
    <span
      className={cn(
        // Align height, radius, and font weight with the shadcn Badge "outline" variant
        "inline-flex items-center font-medium border whitespace-nowrap leading-none",
        "rounded-md", // matches TeamBadge's Badge component which uses rounded-4xl capped to badge radius
        size === "sm"
          ? "text-[11px] px-1.5 py-0.75 h-5"
          : "text-xs px-2 py-0.5 h-5",
        className
      )}
      style={style}
      aria-label={`Skillset: ${name}`}
    >
      {name}
    </span>
  );
}
