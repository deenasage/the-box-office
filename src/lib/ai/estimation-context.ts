// SPEC: ai-estimation.md
// Pure server-side utility — no Claude calls here.
import { Team, TicketSize } from "@prisma/client";
import { STOPWORDS } from "./stopwords";

export interface HistoricalTicket {
  id: string;
  title: string;
  description: string | null;
  team: Team;
  size: TicketSize | null;
  createdAt: Date;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

export function findSimilarTickets(
  candidate: { title: string; description: string | null; team: Team },
  allTickets: HistoricalTicket[],
  limit = 5
): HistoricalTicket[] {
  // Only DONE + sized tickets from the same team
  const pool = allTickets.filter(
    (t) => t.size !== null && t.team === candidate.team
  );

  const candidateTokens = tokenize(
    `${candidate.title} ${candidate.description ?? ""}`
  );

  const scored = pool.map((t) => ({
    ticket: t,
    score: jaccard(
      candidateTokens,
      tokenize(`${t.title} ${t.description ?? ""}`)
    ),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map((s) => s.ticket);

  // If fewer than 3 matches, pad with most recent DONE tickets of the same team
  if (top.length < 3) {
    const recent = pool
      .filter((t) => !top.some((x) => x.id === t.id))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3 - top.length);
    return [...top, ...recent];
  }

  return top;
}
