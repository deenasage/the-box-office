// SPEC: ai-copilot.md
import { db } from "@/lib/db";
import { Team, type BriefStatus } from "@prisma/client";
import { toISO } from "./context-sprints";

export interface BriefSummary {
  id: string;
  title: string;
  status: BriefStatus;
  requiredTeams: Team[];
  creatorName: string;
  createdAt: string;
}

/** Fetch the 10 most recently updated briefs and shape them for copilot context */
export async function fetchBriefContext(): Promise<BriefSummary[]> {
  const briefsRaw = await db.brief.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      requiredTeams: true,
      createdAt: true,
      creator: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const teamValues = new Set(Object.values(Team) as string[]);

  return briefsRaw.map((b) => {
    let requiredTeams: Team[] = [];
    try {
      const parsed: unknown[] = JSON.parse(b.requiredTeams ?? "[]");
      requiredTeams = parsed.filter(
        (v): v is Team => typeof v === "string" && teamValues.has(v)
      );
    } catch {
      requiredTeams = [];
    }
    return {
      id: b.id,
      title: b.title,
      status: b.status,
      requiredTeams,
      creatorName: b.creator.name,
      createdAt: toISO(b.createdAt),
    };
  });
}
