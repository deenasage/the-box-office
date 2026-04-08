// SPEC: custom-fields.md
export interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  teamScope: string | null;
  required: boolean;
  options: string[];
  sortOrder: number;
}

export type CustomFieldDraft = Omit<CustomField, "id" | "sortOrder">;
