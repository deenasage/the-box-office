import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { isPrivileged, isAdmin, isTeamLead } from "@/lib/role-helpers";

export { isPrivileged, isAdmin, isTeamLead };

type AuthSuccess = { session: Session; error: null };
type AuthFailure = { session: null; error: NextResponse };

/**
 * Gets the current session or returns a 401 response.
 */
export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const session = await auth();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

/**
 * Requires the user to be ADMIN or a TEAM_LEAD variant.
 * Use this wherever the old `requireRole(UserRole.TEAM_LEAD)` was called.
 */
export async function requirePrivileged(): Promise<AuthSuccess | AuthFailure> {
  const result = await requireAuth();
  if (!result.session) return result;

  if (!isPrivileged(result.session.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session: result.session, error: null };
}

/**
 * Requires the user to be ADMIN only.
 */
export async function requireAdmin(): Promise<AuthSuccess | AuthFailure> {
  const result = await requireAuth();
  if (!result.session) return result;

  if (result.session.user.role !== UserRole.ADMIN) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session: result.session, error: null };
}

/**
 * @deprecated Use requirePrivileged() or requireAdmin() instead.
 * Kept for backwards compatibility — treats TEAM_LEAD as either team lead variant.
 */
export async function requireRole(
  minRole: UserRole
): Promise<{ session: Session; error: null } | { session: null; error: NextResponse }> {
  if (minRole === UserRole.ADMIN) return requireAdmin();
  if (
    minRole === UserRole.TEAM_LEAD_CRAFT ||
    minRole === UserRole.TEAM_LEAD_STAKEHOLDER
  ) {
    return requirePrivileged();
  }
  // MEMBER_CRAFT / MEMBER_STAKEHOLDER → just requireAuth
  return requireAuth();
}

/** Returns a standard JSON error response. */
export function apiError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
