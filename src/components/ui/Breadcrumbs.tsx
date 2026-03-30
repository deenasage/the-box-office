// SPEC: design-improvements.md
import React from "react";
import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb.label}>
          {i > 0 && <span className="select-none">/</span>}
          {crumb.href && i < crumbs.length - 1
            ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )
            : (
              <span className={i === crumbs.length - 1 ? "text-foreground" : ""}>
                {crumb.label}
              </span>
            )
          }
        </React.Fragment>
      ))}
    </nav>
  );
}
