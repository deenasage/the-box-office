// SPEC: tickets.md
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  page: number;
  total: number;
  pageSize: number;
  /** Base path for page navigation. Defaults to "/tickets". */
  basePath?: string;
}

export function PaginationBar({ page, total, pageSize, basePath = "/tickets" }: PaginationBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${basePath}?${params.toString()}`);
  }

  if (total === 0) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-1 py-2 text-sm text-muted-foreground"
      aria-label="Ticket pagination"
    >
      <span className="shrink-0">
        Showing{" "}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="font-medium text-foreground">{total}</span> ticket
        {total !== 1 ? "s" : ""}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>

        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
