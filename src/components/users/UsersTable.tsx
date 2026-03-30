// SPEC: users.md
"use client";

import { useState } from "react";
import { UserRole, Team } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus } from "lucide-react";
import { EditUserDialog, UserRow } from "./EditUserDialog";
import { CreateUserDialog } from "./CreateUserDialog";

interface UsersTableProps {
  initialUsers: UserRow[];
}

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  [UserRole.ADMIN]: "default",
  [UserRole.TEAM_LEAD]: "secondary",
  [UserRole.MEMBER]: "outline",
};

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);

  function handleSaved(updated: UserRow) {
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? updated : u))
    );
  }

  function handleCreated(newUser: UserRow) {
    setUsers((prev) => [...prev, newUser]);
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New User
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Team</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[user.role]}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.team ?? <span className="italic">None</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(user)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditUserDialog
          user={editing}
          open={true}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            handleSaved(updated);
            setEditing(null);
          }}
        />
      )}

      <CreateUserDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(newUser) => {
          handleCreated(newUser);
          setCreating(false);
        }}
      />
    </>
  );
}
