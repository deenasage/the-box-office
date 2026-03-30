// SPEC: tickets.md
import { Team } from "@prisma/client";

interface RoutingRuleInput {
  keywords: string; // JSON string[]
  team: Team;
  priority: number;
}

function buildHaystack(
  title: string,
  description: string,
  formData?: Record<string, unknown>
): string {
  let haystack = `${title} ${description ?? ""}`.toLowerCase();
  if (formData && typeof formData === "object") {
    const formValues = Object.values(formData)
      .filter((v) => v !== null && v !== undefined)
      .map((v) => (Array.isArray(v) ? v.join(" ") : String(v)))
      .join(" ");
    haystack += " " + formValues.toLowerCase();
  }
  return haystack;
}

/**
 * Returns ALL teams whose rules match the request content, ordered by rule priority.
 * Use this for brief-generated tickets — a brief can trigger work for multiple teams.
 * Returns [Team.CONTENT] as a default when nothing matches.
 */
export function detectTeams(
  title: string,
  description: string,
  rules: RoutingRuleInput[],
  formData?: Record<string, unknown>
): Team[] {
  const haystack = buildHaystack(title, description, formData);
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  const matched: Team[] = [];
  for (const rule of sorted) {
    let keywords: string[] = [];
    try { keywords = JSON.parse(rule.keywords) as string[]; } catch { continue; }
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      if (!matched.includes(rule.team)) matched.push(rule.team);
    }
  }
  return matched.length > 0 ? matched : [Team.CONTENT];
}

/**
 * Returns the SINGLE best-matching team for an intake-form ticket.
 * Uses the highest-priority rule. For briefs that need multi-team tickets, use detectTeams().
 * Defaults to CONTENT if nothing matches.
 */
export function detectTeam(
  title: string,
  description: string,
  rules: RoutingRuleInput[],
  formData?: Record<string, unknown>
): Team {
  return detectTeams(title, description, rules, formData)[0];
}
