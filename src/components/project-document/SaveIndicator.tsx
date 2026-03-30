// SPEC: project-document.md
'use client'

import { SaveState } from '@/hooks/useDocumentTab'
import { Button } from '@/components/ui/button'

interface SaveIndicatorProps {
  state: SaveState
  onRetry?: () => void
}

export function SaveIndicator({ state, onRetry }: SaveIndicatorProps) {
  if (state === 'idle') return null

  if (state === 'saving') {
    return (
      <span className="text-xs text-muted-foreground animate-pulse">
        Saving...
      </span>
    )
  }

  if (state === 'saved') {
    return (
      <span className="text-xs text-green-600 font-medium">
        Saved
      </span>
    )
  }

  // error
  return (
    <span className="flex items-center gap-2 text-xs text-destructive">
      <span>Error — changes not saved</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-0 px-1 text-xs text-destructive underline"
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </span>
  )
}
