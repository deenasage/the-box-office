// SPEC: users.md
"use client";

import { useState } from "react";
import { UserRole, Team, StakeholderTeam } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRow } from "./EditUserDialog";
import { TEAM_LABELS } from "@/lib/constants";
import { ROLE_LABELS } from "@/lib/role-helpers";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (newUser: UserRow) => void;
}

const ALL_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.TEAM_LEAD_CRAFT,
  UserRole.TEAM_LEAD_STAKEHOLDER,
  UserRole.MEMBER_CRAFT,
  UserRole.MEMBER_STAKEHOLDER,
];

const CRAFT_TEAMS: Team[] = [
  Team.CONTENT,
  Team.DESIGN,
  Team.SEO,
  Team.WEM,
  Team.PAID_MEDIA,
  Team.ANALYTICS,
];

const STAKEHOLDER_TEAM_LABELS: Record<StakeholderTeam, string> = {
  DIGITAL_DELIVERY: "Digital Delivery",
  WEB_STRATEGY: "Web Strategy",
  ECOM: "Ecom",
  OPTIMIZATION: "Optimization",
};

const NO_TEAM_SENTINEL = "__none__";

function isCraftRole(role: UserRole) {
  return role === UserRole.MEMBER_CRAFT || role === UserRole.TEAM_LEAD_CRAFT;
}

function isStakeholderRole(role: UserRole) {
  return role === UserRole.MEMBER_STAKEHOLDER || role === UserRole.TEAM_LEAD_STAKEHOLDER;
}

export function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: CreateUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.MEMBER_CRAFT);
  const [team, setTeam] = useState<Team | null>(null);
  const [stakeholderTeam, setStakeholderTeam] = useState<StakeholderTeam | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setRole(UserRole.MEMBER_CRAFT);
    setTeam(null);
    setStakeholderTeam(null);
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleRoleChange(newRole: UserRole) {
    setRole(newRole);
    if (isCraftRole(newRole)) setStakeholderTeam(null);
    if (isStakeholderRole(newRole)) setTeam(null);
    if (newRole === UserRole.ADMIN) { setTeam(null); setStakeholderTeam(null); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          team: isCraftRole(role) ? (team ?? undefined) : undefined,
          stakeholderTeam: isStakeholderRole(role) ? (stakeholderTeam ?? undefined) : undefined,
        }),
      });

      const json = await res.json();

      if (res.status === 409) {
        setError("A user with this email already exists.");
        return;
      }

      if (!res.ok) {
        const msg =
          typeof json.error === "string" ? json.error : "Failed to create user.";
        setError(msg);
        return;
      }

      onCreated(json.data as UserRow);
      handleClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>

        <form
          id="create-user-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 py-2"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              maxLength={100}
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              maxLength={255}
              required
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">
              Password{" "}
              <span className="text-muted-foreground text-xs">(min 8 chars)</span>
            </Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-role">Role</Label>
            <Select value={role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
              <SelectTrigger id="new-role" className="w-full">
                <SelectValue>{ROLE_LABELS[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Craft team — only shown for craft roles */}
          {isCraftRole(role) && (
            <div className="space-y-1.5">
              <Label htmlFor="new-team">
                Team{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select
                value={team ?? NO_TEAM_SENTINEL}
                onValueChange={(v) => setTeam(v === NO_TEAM_SENTINEL ? null : (v as Team))}
              >
                <SelectTrigger id="new-team" className="w-full">
                  <SelectValue>{team == null ? "No team" : TEAM_LABELS[team]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM_SENTINEL}>No team</SelectItem>
                  {CRAFT_TEAMS.map((t) => (
                    <SelectItem key={t} value={t}>{TEAM_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stakeholder department — only shown for stakeholder roles */}
          {isStakeholderRole(role) && (
            <div className="space-y-1.5">
              <Label htmlFor="new-stakeholder-team">
                Department{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select
                value={stakeholderTeam ?? NO_TEAM_SENTINEL}
                onValueChange={(v) =>
                  setStakeholderTeam(v === NO_TEAM_SENTINEL ? null : (v as StakeholderTeam))
                }
              >
                <SelectTrigger id="new-stakeholder-team" className="w-full">
                  <SelectValue>
                    {stakeholderTeam == null ? "No department" : STAKEHOLDER_TEAM_LABELS[stakeholderTeam]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM_SENTINEL}>No department</SelectItem>
                  {(Object.keys(STAKEHOLDER_TEAM_LABELS) as StakeholderTeam[]).map((st) => (
                    <SelectItem key={st} value={st}>{STAKEHOLDER_TEAM_LABELS[st]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            disabled={saving}
          >
            {saving ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
