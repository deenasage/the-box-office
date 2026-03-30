// SPEC: users.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserRole, Team } from "@prisma/client";

interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: Team | null;
}

interface AccountSettingsFormProps {
  user: AccountUser;
}

export function AccountSettingsForm({ user }: AccountSettingsFormProps) {
  const router = useRouter();

  // ── Profile state ──────────────────────────────────────────────
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // ── Password state ─────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);

    if (!name.trim()) {
      setProfileError("Name is required.");
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : "Failed to update profile.";
        setProfileError(msg);
        return;
      }

      toast.success("Profile updated");
      // Re-fetch server session so the sidebar reflects the new name/email.
      router.refresh();
    } catch {
      setProfileError("Network error — please try again.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : "Failed to change password.";
        setPasswordError(msg);
        return;
      }

      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Network error — please try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-lg">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setProfileError(null); }}
                maxLength={100}
                required
                autoComplete="name"
                aria-invalid={!!profileError}
                aria-describedby={profileError ? "profile-error" : undefined}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                required
                autoComplete="email"
              />
            </div>

            {profileError && (
              <p id="profile-error" className="text-sm text-destructive -mt-1" role="alert">
                {profileError}
              </p>
            )}

            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? "Saving…" : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter your current password and choose a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); }}
                autoComplete="current-password"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
                autoComplete="new-password"
              />
              {passwordError && (
                <p id="password-error" className="text-sm text-destructive" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
