// SPEC: custom-fields.md
import { CustomFieldsClient } from "@/components/admin/CustomFieldsClient";

export const metadata = { title: "Custom Fields — Admin" };

async function getCustomFields() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/admin/custom-fields`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function CustomFieldsPage() {
  const fields = await getCustomFields();
  return <CustomFieldsClient fields={fields} />;
}
