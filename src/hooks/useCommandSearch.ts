// SPEC: search.md
"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

export interface SearchTicket {
  id: string;
  title: string;
  status: string;
  team: string;
}

export interface SearchEpic {
  id: string;
  name: string;
  status: string;
}

export interface SearchBrief {
  id: string;
  title: string;
  status: string;
}

export interface SearchResults {
  tickets: SearchTicket[];
  epics: SearchEpic[];
  briefs: SearchBrief[];
}

export type FlatResult =
  | { kind: "ticket"; id: string; label: string; status: string; href: string }
  | { kind: "epic"; id: string; label: string; status: string; href: string }
  | { kind: "brief"; id: string; label: string; status: string; href: string };

interface UseCommandSearchReturn {
  results: SearchResults | null;
  flat: FlatResult[];
  loading: boolean;
}

export function useCommandSearch(query: string): UseCommandSearchReturn {
  const debouncedQuery = useDebounce(query, 200);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((json: { data: SearchResults }) => {
        if (!cancelled) {
          setResults(json.data);
        }
      })
      .catch(() => {
        if (!cancelled) setResults(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const flat: FlatResult[] = results
    ? [
        ...results.tickets.map((t) => ({
          kind: "ticket" as const,
          id: t.id,
          label: t.title,
          status: t.status,
          href: `/tickets/${t.id}`,
        })),
        ...results.epics.map((e) => ({
          kind: "epic" as const,
          id: e.id,
          label: e.name,
          status: e.status,
          href: `/portfolio/${e.id}`,
        })),
        ...results.briefs.map((b) => ({
          kind: "brief" as const,
          id: b.id,
          label: b.title,
          status: b.status,
          href: `/briefs/${b.id}`,
        })),
      ]
    : [];

  return { results, flat, loading };
}
