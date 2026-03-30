// SPEC: guest-intake.md
// Public page — no authentication required.
// Shows the active form template for external stakeholder submissions.

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { IntakeFormClient } from "./IntakeFormClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { FormFieldConfig, ConditionalRule } from "@/types";

export const metadata = {
  title: "Submit a Request | The Box Office",
  description: "Submit a new request to The Box Office team.",
};

export default async function PublicIntakePage() {
  const [session, template] = await Promise.all([
    auth(),
    db.formTemplate.findFirst({
      where: { isActive: true },
      include: { fields: { orderBy: { order: "asc" } } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal branded header — no nav, no sidebar */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-2.5">
        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-[11px] font-bold">TBO</span>
        </div>
        <span className="font-semibold text-sm">The Box Office</span>
        {session && (
          <Link
            href="/"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </Link>
        )}
      </header>

      <main className="px-4 py-10 max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Submit a Request</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill out the form below and our team will review your request.
          </p>
        </div>

        {!template ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            No intake form is currently active. Please check back later or
            contact the team directly.
          </div>
        ) : (
          <IntakeFormClient
            fields={template.fields.map((f): FormFieldConfig => ({
              id: f.id,
              label: f.label,
              fieldKey: f.fieldKey,
              type: f.type,
              required: f.required,
              order: f.order,
              options: f.options
                ? (JSON.parse(f.options) as string[])
                : undefined,
              conditions: f.conditions
                ? (JSON.parse(f.conditions) as ConditionalRule[])
                : undefined,
            }))}
            templateId={template.id}
            formName={template.name}
            formDescription={template.description}
          />
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <span className="font-medium">The Box Office</span>
        </p>
      </main>
    </div>
  );
}
