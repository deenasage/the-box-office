// SPEC: roles.md
import { UserRole } from "@prisma/client";

/**
 * Returns true for roles that can see all teams' tickets (elevated access).
 * ADMIN, TEAM_LEAD_CRAFT, TEAM_LEAD_STAKEHOLDER all qualify.
 */
export function isPrivileged(role: UserRole | string): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.TEAM_LEAD_CRAFT ||
    role === UserRole.TEAM_LEAD_STAKEHOLDER
  );
}

/** Returns true only for ADMIN. */
export function isAdmin(role: UserRole | string): boolean {
  return role === UserRole.ADMIN;
}

/** Returns true for either TEAM_LEAD role variant. */
export function isTeamLead(role: UserRole | string): boolean {
  return (
    role === UserRole.TEAM_LEAD_CRAFT ||
    role === UserRole.TEAM_LEAD_STAKEHOLDER
  );
}

/**
 * Returns true when the user operates in "craft" mode — i.e. they see tickets
 * assigned to them (work to do), not tickets they've submitted.
 * Craft roles always use craft view. ADMIN uses the adminViewMode cookie.
 */
export function isCraftView(
  role: UserRole | string,
  adminViewMode?: string | null
): boolean {
  if (role === UserRole.ADMIN) return adminViewMode !== "stakeholder";
  return (
    role === UserRole.MEMBER_CRAFT || role === UserRole.TEAM_LEAD_CRAFT
  );
}

/**
 * Returns true when the user operates in "stakeholder" mode — i.e. they see
 * tickets they've submitted or where they are the named owner.
 */
export function isStakeholderView(
  role: UserRole | string,
  adminViewMode?: string | null
): boolean {
  if (role === UserRole.ADMIN) return adminViewMode === "stakeholder";
  return (
    role === UserRole.MEMBER_STAKEHOLDER ||
    role === UserRole.TEAM_LEAD_STAKEHOLDER
  );
}

/** Human-readable label for each role. */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  TEAM_LEAD_CRAFT: "Team Lead — Craft",
  TEAM_LEAD_STAKEHOLDER: "Team Lead — Stakeholder",
  MEMBER_CRAFT: "Member — Craft",
  MEMBER_STAKEHOLDER: "Member — Stakeholder",
};
