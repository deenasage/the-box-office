// SPEC: guest-intake.md
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldRenderer } from "@/components/forms/FieldRenderer";
import { evaluateConditions } from "@/lib/form-logic";
import type { FormFieldConfig } from "@/types";

interface IntakeFormClientProps {
  fields: FormFieldConfig[];
  templateId: string;
  formName: string;
  formDescription?: string | null;
}

export function IntakeFormClient({
  fields,
  templateId,
  formName,
  formDescription,
}: IntakeFormClientProps) {
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function setValue(key: string, value: unknown) {
    setValues((prev) => ({ ...prev, [key]: value }));
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

    // Validate submitter fields
    if (!submitterName.trim()) {
      setError("Your name is required.");
      return;
    }
    if (!submitterEmail.trim()) {
      setError("Your email is required.");
      return;
    }

    // Validate visible required form fields
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
      const firstKey = Object.keys(newFieldErrors)[0];
      document
        .getElementById(`field-${firstKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);

    // Only send visible field values
    const filteredData: Record<string, unknown> = {};
    for (const field of fields) {
      const { visible } = evaluateConditions(field, values);
      if (visible) filteredData[field.fieldKey] = values[field.fieldKey] ?? "";
    }

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData: filteredData,
          templateId,
          submitterName: submitterName.trim(),
          submitterEmail: submitterEmail.trim(),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string };
        setError(payload.error ?? "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-8 text-center space-y-4">
        <div className="text-4xl">&#10003;</div>
        <p className="text-xl font-semibold">Request received!</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Thank you, {submitterName}. Your request has been submitted and our
          team will be in touch shortly.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSubmitted(false);
            setValues({});
            setSubmitterName("");
            setSubmitterEmail("");
          }}
        >
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Submitter identity — always shown at the top */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Your details
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="submitter-name">
            Your Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="submitter-name"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="Full name"
            maxLength={255}
            autoComplete="name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="submitter-email">
            Your Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="submitter-email"
            type="email"
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={255}
            autoComplete="email"
          />
        </div>
      </div>

      {/* Dynamic form fields */}
      {fields.length > 0 && (
        <div className="space-y-5">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {formName}
          </p>
          {formDescription && (
            <p className="text-sm text-muted-foreground -mt-2">{formDescription}</p>
          )}

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
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Submitting…" : "Submit Request"}
      </Button>
    </form>
  );
}
