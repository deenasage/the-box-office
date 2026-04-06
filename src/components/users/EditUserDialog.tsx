// SPEC: design-improvements.md
// SPEC: users.md
// SPEC: skillsets.md
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
import { TEAM_LABELS } from "@/lib/constants";
import { UserSkillsetsEditor } from "@/components/skillsets/UserSkillsetsEditor";
import { ROLE_LABELS } from "@/lib/role-helpers";
import { isTeamLead } from "@/lib/role-helpers";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: Team | null;
  stakeholderTeam?: StakeholderTeam | null;
  skillsets?: { id: string; name: string; color: string }[];
}

interface EditUserDialogProps {
  user: UserRow;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: UserRow) => void;
  /** ADMIN or TEAM_LEAD = editable; MEMBER_CRAFT = read-only chips */
  editorRole?: UserRole;
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

export function EditUserDialog({ user, open, onClose, onSaved, editorRole = UserRole.ADMIN }: EditUserDialogProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role);
  const [team, setTeam] = useState<Team | null>(user.team);
  const [stakeholderTeam, setStakeholderTeam] = useState<StakeholderTeam | null>(
    user.stakeholderTeam ?? null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(newRole: UserRole) {
    setRole(newRole);
    // Clear incompatible team when switching modes
    if (isCraftRole(newRole)) setStakeholderTeam(null);
    if (isStakeholderRole(newRole)) setTeam(null);
    if (newRole === UserRole.ADMIN) { setTeam(null); setStakeholderTeam(null); }
  }

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
          team: isCraftRole(role) ? team : null,
          stakeholderTeam: isStakeholderRole(role) ? stakeholderTeam : null,
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
            <Select value={role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
              <SelectTrigger id="edit-role">
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

          {/* Craft team — only for craft roles */}
          {isCraftRole(role) && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-team">Team</Label>
              <Select
                value={team ?? NO_TEAM_SENTINEL}
                onValueChange={(v) => setTeam(v === NO_TEAM_SENTINEL ? null : (v as Team))}
              >
                <SelectTrigger id="edit-team">
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

          {/* Stakeholder team — only for stakeholder roles */}
          {isStakeholderRole(role) && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-stakeholder-team">Department</Label>
              <Select
                value={stakeholderTeam ?? NO_TEAM_SENTINEL}
                onValueChange={(v) =>
                  setStakeholderTeam(v === NO_TEAM_SENTINEL ? null : (v as StakeholderTeam))
                }
              >
                <SelectTrigger id="edit-stakeholder-team">
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

          {team === Team.DESIGN && isCraftRole(role) && (
            <div className="space-y-1.5 pt-1">
              <UserSkillsetsEditor
                userId={user.id}
                userTeam={team ?? ""}
                initialSkillsets={user.skillsets ?? []}
                readonly={isTeamLead(editorRole)}
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
