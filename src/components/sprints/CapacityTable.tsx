// SPEC: sprints.md
"use client";

import { useState } from "react";
import { isTeamLead } from "@/lib/role-helpers";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamBadge } from "@/components/tickets/TeamBadge";
import { Team, UserRole } from "@prisma/client";

interface CapacityRecord {
  id: string;
  userId: string;
  points: number;
  hours: number | null;
  user: { id: string; name: string; team: Team | null };
}

interface CapacityTableProps {
  sprintId: string;
  capacities: CapacityRecord[];
  users: { id: string; name: string; team: Team | null }[];
  currentUserRole?: UserRole;
  currentUserTeam?: Team | null;
}

export function CapacityTable({
  sprintId,
  capacities,
  users,
  currentUserRole,
  currentUserTeam,
}: CapacityTableProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [points, setPoints] = useState("");
  const [saving, setSaving] = useState(false);

  const canEdit = (userTeam: Team | null) => {
    if (currentUserRole === UserRole.ADMIN) return true;
    if (isTeamLead(currentUserRole as UserRole) && userTeam === currentUserTeam) return true;
    return false;
  };

  async function save(userId: string) {
    setSaving(true);
    await fetch(`/api/sprints/${sprintId}/capacity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, points: parseInt(points) }),
    });
    setSaving(false);
    setEditing(null);
    router.refresh();
  }

  // Show all users, merge with capacity data
  const rows = users.map((user) => {
    const cap = capacities.find((c) => c.userId === user.id);
    return { user, points: cap?.points ?? null };
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Member</th>
            <th className="text-left px-3 py-2 font-medium">Team</th>
            <th className="text-right px-3 py-2 font-medium">Hours</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(({ user, points: pts }) => (
            <tr key={user.id} className="hover:bg-muted/20">
              <td className="px-3 py-2">{user.name}</td>
              <td className="px-3 py-2">
                {user.team ? <TeamBadge team={user.team} /> : <span className="text-muted-foreground">—</span>}
              </td>
              <td className="px-3 py-2 text-right">
                {editing === user.id ? (
                  <Input
                    type="number"
                    className="h-7 w-20 text-right ml-auto"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    min="0"
                  />
                ) : (
                  <span className={pts == null ? "text-muted-foreground" : "font-medium"}>
                    {pts != null ? `${pts}h` : "—"}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                {canEdit(user.team) && (
                  editing === user.id ? (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" className="h-6 text-xs px-2" onClick={() => save(user.id)} disabled={saving}>
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs px-2"
                      onClick={() => { setEditing(user.id); setPoints(String(pts ?? "")); }}
                    >
                      Edit
                    </Button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
