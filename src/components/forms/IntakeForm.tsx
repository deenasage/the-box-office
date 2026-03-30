// SPEC: form-builder.md
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldRenderer } from "./FieldRenderer";
import { evaluateConditions } from "@/lib/form-logic";
import type { FormFieldConfig } from "@/types";

interface IntakeFormProps {
  fields: FormFieldConfig[];
  templateId: string;
}

export function IntakeForm({ fields, templateId }: IntakeFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; team: string } | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear per-field error as user types
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Task 11: validate visible required fields before submitting
    const newFieldErrors: Record<string, string> = {};
    for (const field of fields) {
      const { visible, required } = evaluateConditions(field, values);
      if (!visible) continue;
      if (!required) continue;
      const val = values[field.fieldKey];
      const isEmpty =
        val == null ||
        val === "" ||
        val === false ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        newFieldErrors[field.fieldKey] = `${field.label} is required`;
      }
    }
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      const firstErrorKey = Object.keys(newFieldErrors)[0];
      document.getElementById(`field-${firstErrorKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

    // Only include values from visible fields
    const filteredData: Record<string, unknown> = {};
    for (const field of fields) {
      const { visible } = evaluateConditions(field, values);
      if (visible) filteredData[field.fieldKey] = values[field.fieldKey] ?? "";
    }

    const title =
      (filteredData["title"] as string) ||
      (filteredData[fields[0]?.fieldKey] as string) ||
      "New Request";

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: filteredData["description"] as string | undefined,
          formData: filteredData,
          templateId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "Something went wrong. Please try again.");
      } else {
        const payload = await res.json();
        const ticket = payload.data ?? payload;
        setResult({ id: ticket.id, team: ticket.team });
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="p-6 border rounded-lg bg-muted/30 space-y-3 text-center">
        <p className="text-2xl">✓</p>
        <p className="font-semibold">Request submitted!</p>
        <p className="text-sm text-muted-foreground">
          Ticket #{result.id.slice(-8).toUpperCase()} has been assigned to the{" "}
          <strong>{result.team}</strong> team.
        </p>
        <Link
          href={`/tickets/${result.id}`}
          className="inline-block text-sm text-primary underline underline-offset-4"
        >
          View ticket →
        </Link>
        <div>
          <Button variant="outline" size="sm" onClick={() => { setResult(null); setValues({}); }}>
            Submit another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => {
        const { visible, required } = evaluateConditions(field, values);
        if (!visible) return null;
        return (
          <FieldRenderer
            key={field.id}
            field={field}
            value={values[field.fieldKey]}
            onChange={(v) => setValue(field.fieldKey, v)}
            required={required}
            error={fieldErrors[field.fieldKey]}
          />
        );
      })}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting…" : "Submit Request"}
      </Button>
    </form>
  );
}
