import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { UserRole } from "@prisma/client";

type AuthSuccess = { session: Session; error: null };
type AuthFailure = { session: null; error: NextResponse };

/**
 * Gets the current session or returns a 401 response.
 * Usage:
 *   const { session, error } = await requireAuth();
 *   if (error) return error;
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
 * Gets the current session and checks the user meets a minimum role level.
 * Role order (ascending): MEMBER < TEAM_LEAD < ADMIN
 * Usage:
 *   const { session, error } = await requireRole(UserRole.TEAM_LEAD);
 *   if (error) return error;
 */
export async function requireRole(
  minRole: UserRole
): Promise<{ session: Session; error: null } | { session: null; error: NextResponse }> {
  const result = await requireAuth();
  if (!result.session) return result;

  const roleOrder = [UserRole.MEMBER, UserRole.TEAM_LEAD, UserRole.ADMIN];
  const userLevel = roleOrder.indexOf(result.session.user.role as UserRole);
  const minLevel = roleOrder.indexOf(minRole);

  if (userLevel < minLevel) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session: result.session, error: null };
}

/** Returns a standard JSON error response. */
export function apiError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
