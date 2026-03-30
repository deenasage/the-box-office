// SPEC: project-document.md
'use client'

import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ColumnDef<T> {
  key: keyof T
  label: string
  type?: 'text' | 'checkbox' | 'select' | 'date' | 'url' | 'readonly'
  options?: string[]
  width?: string
}

interface EditableTableProps<T extends { id: string | number }> {
  rows: T[]
  columns: ColumnDef<T>[]
  onChange: (rows: T[]) => void
  onAddRow: () => void
  onDeleteRow: (id: string | number) => void
  addRowLabel?: string
}

export function EditableTable<T extends { id: string | number }>({
  rows,
  columns,
  onChange,
  onAddRow,
  onDeleteRow,
  addRowLabel = 'Add row',
}: EditableTableProps<T>) {
  function updateCell(rowId: string | number, key: keyof T, value: T[keyof T]) {
    onChange(rows.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)))
  }

  function renderCell(row: T, col: ColumnDef<T>) {
    const value = row[col.key]
    const id = `cell-${String(row.id)}-${String(col.key)}`

    if (col.type === 'readonly') {
      return (
        <span className="text-sm text-muted-foreground px-1">
          {String(value ?? '')}
        </span>
      )
    }

    if (col.type === 'checkbox') {
      return (
        <div className="flex justify-center">
          <Checkbox
            id={id}
            checked={value as boolean}
            onCheckedChange={(checked) =>
              updateCell(row.id, col.key, checked as T[keyof T])
            }
            aria-label={col.label}
          />
        </div>
      )
    }

    if (col.type === 'select' && col.options) {
      return (
        <Select
          value={String(value ?? '')}
          onValueChange={(v) => updateCell(row.id, col.key, v as T[keyof T])}
        >
          <SelectTrigger size="sm" className="min-w-[110px]" aria-label={col.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {col.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Input
        id={id}
        type={col.type === 'date' ? 'date' : col.type === 'url' ? 'url' : 'text'}
        value={String(value ?? '')}
        onChange={(e) => updateCell(row.id, col.key, e.target.value as T[keyof T])}
        className="h-7 min-w-[80px] text-xs"
        aria-label={col.label}
        style={col.width ? { width: col.width } : undefined}
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap border-b border-border"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
            <th className="w-8 border-b border-border" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No rows yet. Click &apos;{addRowLabel}&apos; to begin.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={String(row.id)}
                className="border-b border-border last:border-0 hover:bg-muted/30 group"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-2 py-1">
                    {renderCell(row, col)}
                  </td>
                ))}
                <td className="px-1 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteRow(row.id)}
                    aria-label="Delete row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="p-2 border-t border-border bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={onAddRow}
        >
          <Plus className="h-3.5 w-3.5" />
          {addRowLabel}
        </Button>
      </div>
    </div>
  )
}
