// SPEC: auth.md
// Edge-compatible proxy (Next.js 16 renamed middleware → proxy).
// Uses authConfig without DB imports for edge compatibility.
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
