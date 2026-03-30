// SPEC: auth.md
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// SSO button is shown only when NEXT_PUBLIC_SSO_ENABLED=true in the environment.
// To activate, set that env var AND the server-side SSO_* vars (see .env.local).
const ssoEnabled = process.env.NEXT_PUBLIC_SSO_ENABLED === "true";
const ssoProviderName = process.env.NEXT_PUBLIC_SSO_PROVIDER_NAME ?? "SSO";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleSsoSignIn() {
    setSsoLoading(true);
    await signIn("sso", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold">TBO</span>
          </div>
          <span className="font-semibold text-sm">The Box Office</span>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SSO button — only rendered when SSO is enabled */}
            {ssoEnabled && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleSsoSignIn}
                  disabled={ssoLoading}
                  aria-label={`Sign in with ${ssoProviderName}`}
                >
                  {ssoLoading ? "Redirecting…" : `Sign in with ${ssoProviderName}`}
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@ticketintake.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
