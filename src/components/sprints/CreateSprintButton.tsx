// SPEC: sprints.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { notify } from "@/lib/toast";

export function CreateSprintButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          notes: form.get("notes") || undefined,
          startDate: new Date(form.get("startDate") as string).toISOString(),
          endDate: new Date(form.get("endDate") as string).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        notify.error(data.error ?? "Failed to create sprint");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      notify.error("Failed to create sprint. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" /> New Sprint
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Sprint</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Sprint name *</Label>
            <Input id="name" name="name" required placeholder="Sprint 2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="What does this sprint achieve?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date *</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date *</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Sprint"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
