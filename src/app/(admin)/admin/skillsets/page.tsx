// SPEC: skillsets.md
// SPEC: design-improvements.md
import { db } from "@/lib/db";
import { SkillsetsManager } from "@/components/skillsets/SkillsetsManager";

export default async function AdminSkillsetsPage() {
  let skillsets;
  try {
    skillsets = await db.skillset.findMany({
      where: { team: "DESIGN" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, team: true, color: true, isActive: true },
    });
  } catch {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-destructive">Failed to load skillsets. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Page header — mirrors the layout used on /admin/users */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skillsets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Design team skillsets. Assign skillsets to members on the{" "}
            <a href="/admin/users" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Users page
            </a>
            .
          </p>
        </div>
      </div>

      {/* Section label — "Design" team; future teams will each get their own section */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Design
        </h2>
        <SkillsetsManager initialSkillsets={skillsets} />
      </div>
    </div>
  );
}
