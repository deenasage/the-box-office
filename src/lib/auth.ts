// SPEC: auth.md
// v2
// SSO groundwork: OIDC provider is registered only when SSO_CLIENT_ID + SSO_CLIENT_SECRET
// are set in the environment. Set SSO_ENABLED=true in .env.local to activate it.
// Credentials login always remains available for local dev / demo use.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { OIDCConfig } from "next-auth/providers";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";
import { UserRole, Team } from "@prisma/client";

// ── Shared profile shape returned by OIDC providers ───────────────────────────
interface OIDCProfile {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
}

// ── Build provider list dynamically ───────────────────────────────────────────
// The OIDC provider is only included when all three env vars are present.
// This lets the app run in full credentials-only mode for demos without any changes.
const ssoEnabled =
  process.env.SSO_ENABLED === "true" &&
  !!process.env.SSO_CLIENT_ID &&
  !!process.env.SSO_CLIENT_SECRET &&
  !!process.env.SSO_ISSUER;

const oidcProvider = ssoEnabled
  ? ({
      id: "sso",
      name: process.env.SSO_PROVIDER_NAME ?? "SSO",
      type: "oidc" as const,
      issuer: process.env.SSO_ISSUER!,
      clientId: process.env.SSO_CLIENT_ID!,
      clientSecret: process.env.SSO_CLIENT_SECRET!,
      // The profile callback returns a minimal shape; full user enrichment
      // happens in the jwt callback where we can do async DB lookups.
      profile(profile: OIDCProfile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name ?? profile.preferred_username ?? profile.email,
          // role/team are filled in by the jwt callback after DB upsert
          role: "MEMBER_CRAFT" as UserRole,
          team: null as Team | null,
        };
      },
    })
  : null;

// ── NextAuth config ───────────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate-limit by email address to prevent brute-force attacks.
        // The key uses the email so that only attempts against a specific
        // account are counted. For a real deployment, also key on the client
        // IP (pass it via a custom header from middleware).
        const ip = "credentials"; // replace with real IP when middleware provides it
        const rateLimitKey = `login:${credentials.email as string}:${ip}`;
        if (!checkRateLimit(rateLimitKey)) {
          throw new Error("Too many login attempts. Please try again in a minute.");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;

        // SSO-only accounts have an empty password and cannot use credentials login
        if (!user.password) return null;

        const valid = await compare(credentials.password as string, user.password);
        if (!valid) return null;

        // Clear the counter on a successful login so legitimate users are not
        // locked out after recovering from a forgotten password.
        clearRateLimit(rateLimitKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          team: user.team,
        };
      },
    }),
    ...(oidcProvider ? [oidcProvider] : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user && account) {
        if (account.provider === "sso" && profile) {
          // OIDC sign-in: upsert user by ssoId+ssoProvider first, then fall back to email
          const oidcProfile = profile as OIDCProfile;

          // Step 1: look up by ssoId + ssoProvider ONLY (the authoritative link)
          let dbUser = await db.user.findFirst({
            where: { ssoId: oidcProfile.sub, ssoProvider: account.provider },
          });

          if (!dbUser) {
            // Step 2: look up by email — only link if the account has no ssoProvider yet
            // (i.e., a credentials-only account being linked for the first time).
            // Refuse login if the email is already owned by a DIFFERENT SSO provider to
            // prevent email-claim hijacking.
            const byEmail = await db.user.findUnique({
              where: { email: oidcProfile.email },
            });

            if (byEmail) {
              if (byEmail.ssoProvider !== null && byEmail.ssoProvider !== account.provider) {
                // Email is already linked to a different SSO provider — refuse login
                return token;
              }
              dbUser = byEmail;
            }
          }

          dbUser = await db.$transaction(async (tx) => {
            if (!dbUser) {
              // Provision a new user on first SSO login
              return tx.user.create({
                data: {
                  email: oidcProfile.email,
                  name: oidcProfile.name ?? oidcProfile.email,
                  password: "", // SSO-only — no password login
                  ssoProvider: account.provider,
                  ssoId: oidcProfile.sub,
                },
              });
            } else if (!dbUser.ssoId) {
              // Link existing email-based account to SSO
              return tx.user.update({
                where: { id: dbUser.id },
                data: { ssoProvider: account.provider, ssoId: oidcProfile.sub },
              });
            }
            return dbUser;
          });

          token.id = dbUser.id;
          token.role = dbUser.role as UserRole;
          token.team = dbUser.team as Team | null;
        } else {
          // Credentials sign-in
          token.id = user.id;
          token.role = user.role as UserRole;
          token.team = user.team as Team | null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.team = token.team as Team | null;
      return session;
    },
  },
});

// Exported so the login page can conditionally show the SSO button
export const SSO_ENABLED = ssoEnabled;
export const SSO_PROVIDER_NAME = process.env.SSO_PROVIDER_NAME ?? "SSO";
