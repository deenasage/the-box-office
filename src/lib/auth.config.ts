// SPEC: auth.md
// Edge-compatible auth config — no DB imports
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      const isApiRoute = nextUrl.pathname.startsWith("/api/");

      // Public routes — no auth required
      const isPublicPage =
        nextUrl.pathname === "/intake" ||
        nextUrl.pathname.startsWith("/briefs/share/");
      const isPublicApi =
        nextUrl.pathname.startsWith("/api/intake") ||
        nextUrl.pathname.startsWith("/api/briefs/share/");
      if (isPublicPage || isPublicApi) return true;

      if (isLoggedIn && isLoginPage) return Response.redirect(new URL("/", nextUrl));
      if (!isLoggedIn && !isLoginPage) {
        if (isApiRoute) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return Response.redirect(new URL("/login", nextUrl));
      }
      return true;
    },
  },
};
