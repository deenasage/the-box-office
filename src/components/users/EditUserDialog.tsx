// SPEC: design-improvements.md
// SPEC: users.md
// SPEC: skillsets.md
"use client";

import { useState } from "react";
import { UserRole, Team } from "@prisma/client";
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
import { TEAM_LABELS } from "@/lib/constants";
import { UserSkillsetsEditor } from "@/components/skillsets/UserSkillsetsEditor";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: Team | null;
  skillsets?: { id: string; name: string; color: string }[];
}

interface EditUserDialogProps {
  user: UserRow;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: UserRow) => void;
  /** ADMIN or TEAM_LEAD = editable; MEMBER = read-only chips */
  editorRole?: UserRole;
}

const ROLES: UserRole[] = [UserRole.ADMIN, UserRole.TEAM_LEAD, UserRole.MEMBER];
const TEAMS: Team[] = [
  Team.CONTENT,
  Team.DESIGN,
  Team.SEO,
  Team.WEM,
  Team.PAID_MEDIA,
  Team.ANALYTICS,
];
const NO_TEAM_SENTINEL = "__none__";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  TEAM_LEAD: "Team Lead",
  MEMBER: "Member",
};

export function EditUserDialog({ user, open, onClose, onSaved, editorRole = UserRole.ADMIN }: EditUserDialogProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role);
  const [team, setTeam] = useState<Team | null>(user.team);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Name must not be empty.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          role,
          team,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : "Failed to save changes.";
        setError(msg);
        return;
      }

      onSaved(json.data as UserRow);
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleTeamChange(value: string | null) {
    setTeam(!value || value === NO_TEAM_SENTINEL ? null : (value as Team));
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="edit-role">
                <SelectValue>{ROLE_LABELS[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-team">Team</Label>
            <Select
              value={team ?? NO_TEAM_SENTINEL}
              onValueChange={handleTeamChange}
            >
              <SelectTrigger id="edit-team">
                <SelectValue>{team == null ? "No team" : TEAM_LABELS[team]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEAM_SENTINEL}>No team</SelectItem>
                {TEAMS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEAM_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {team === Team.DESIGN && (
            <div className="space-y-1.5 pt-1">
              <UserSkillsetsEditor
                userId={user.id}
                userTeam={team ?? ""}
                initialSkillsets={user.skillsets ?? []}
                readonly={editorRole === UserRole.MEMBER}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
