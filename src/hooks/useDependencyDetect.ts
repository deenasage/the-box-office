// SPEC: dependencies.md
"use client";

import { useState } from "react";
import { Team, DependencyType } from "@prisma/client";

export interface AIDetectedDependency {
  fromTicketId: string;
  fromTicketTitle: string;
  fromTicketTeam: Team;
  toTicketId: string;
  toTicketTitle: string;
  toTicketTeam: Team;
  type: DependencyType;
  confidence: number;
  rationale: string;
}

interface ConfirmPayload {
  fromTicketId: string;
  toTicketId: string;
  type: DependencyType;
}

export function useDependencyDetect(briefId: string) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [suggestions, setSuggestions] = useState<AIDetectedDependency[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);

  async function detect() {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    setConfirmedCount(null);
    try {
      const res = await fetch(`/api/briefs/${briefId}/detect-dependencies`, { method: "POST" });
      const data = await res.json() as AIDetectedDependency[] | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Detection failed.");
      } else {
        setSuggestions(data as AIDetectedDependency[]);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function rejectSuggestion(index: number) {
    setSuggestions((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function postConfirm(payload: ConfirmPayload[]) {
    return fetch("/api/dependencies/confirm-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestions: payload }),
    });
  }

  async function confirmOne(index: number) {
    if (!suggestions) return;
    const s = suggestions[index];
    setConfirming(true);
    try {
      const res = await postConfirm([
        { fromTicketId: s.fromTicketId, toTicketId: s.toTicketId, type: s.type },
      ]);
      if (res.ok) {
        setSuggestions((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
        setConfirmedCount((c) => (c ?? 0) + 1);
      }
    } finally {
      setConfirming(false);
    }
  }

  async function confirmAll() {
    if (!suggestions || suggestions.length === 0) return;
    setConfirming(true);
    try {
      const res = await postConfirm(
        suggestions.map((s) => ({
          fromTicketId: s.fromTicketId,
          toTicketId: s.toTicketId,
          type: s.type,
        })),
      );
      if (res.ok) {
        setConfirmedCount(suggestions.length);
        setSuggestions([]);
      }
    } finally {
      setConfirming(false);
    }
  }

  return {
    loading,
    confirming,
    suggestions,
    error,
    confirmedCount,
    detect,
    rejectSuggestion,
    confirmOne,
    confirmAll,
  };
}
