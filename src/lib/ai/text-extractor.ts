// SPEC: ai-brief.md
// Server-side only — never import this in client components.

const MAX_CHARS = 50_000;

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<{ text: string; truncated: boolean }> {
  let text = "";

  if (mimeType === "text/plain" || mimeType === "text/html") {
    text = buffer.toString("utf-8");
  } else if (mimeType === "application/pdf") {
    // pdf-parse ships CJS; use require to avoid ESM .default issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    text = result.text;
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (mimeType === "message/rfc822") {
    const { simpleParser } = await import("mailparser");
    const parsed = await simpleParser(buffer);
    text = [parsed.subject, parsed.text].filter(Boolean).join("\n\n");
  }

  if (text.length > MAX_CHARS) {
    return { text: text.slice(0, MAX_CHARS), truncated: true };
  }
  return { text, truncated: false };
}
