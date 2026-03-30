// SPEC: sprints.md
// SPEC: design-improvements.md
"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SprintsTabBarProps {
  activeTab: "sprints" | "goals" | "velocity";
}

const TAB_ITEMS = [
  { value: "sprints", label: "All Sprints", href: "/sprints?tab=sprints" },
  { value: "goals",   label: "Notes",       href: "/sprints?tab=goals" },
  { value: "velocity", label: "Velocity",   href: "/sprints?tab=velocity" },
] as const;

export function SprintsTabBar({ activeTab }: SprintsTabBarProps) {
  const router = useRouter();

  return (
    <Tabs value={activeTab} onValueChange={(value) => {
      const item = TAB_ITEMS.find((t) => t.value === value);
      if (item) router.push(item.href);
    }}>
      <TabsList variant="line" className="w-full justify-start border-b rounded-none pb-0 h-auto gap-0">
        {TAB_ITEMS.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="px-4 py-2 rounded-none border-b-2 border-transparent data-active:border-primary"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
