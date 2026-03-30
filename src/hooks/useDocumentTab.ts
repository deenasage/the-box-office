// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ProjectDocumentUpdatePayload } from '@/types/project-document'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface UseDocumentTabOptions {
  epicId: string
  /** The key in the payload this tab manages */
  tabKey: keyof ProjectDocumentUpdatePayload
  /** Debounce delay in ms (default 800) */
  delay?: number
}

interface UseDocumentTabReturn<T> {
  saveState: SaveState
  save: (data: T) => void
  retry: () => void
}

export function useDocumentTab<T>({
  epicId,
  tabKey,
  delay = 800,
}: UseDocumentTabOptions): UseDocumentTabReturn<T> {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const pendingRef = useRef<T | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(
    async (data: T) => {
      setSaveState('saving')
      try {
        const res = await fetch(`/api/portfolio/${epicId}/document`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [tabKey]: data }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setSaveState('saved')
        savedTimerRef.current = setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('error')
      }
    },
    [epicId, tabKey]
  )

  const save = useCallback(
    (data: T) => {
      pendingRef.current = data
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (pendingRef.current !== null) {
          void flush(pendingRef.current)
          pendingRef.current = null
        }
      }, delay)
    },
    [flush, delay]
  )

  const retry = useCallback(() => {
    if (pendingRef.current !== null) {
      void flush(pendingRef.current)
    }
  }, [flush])

  // Warn on unload when save is pending
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingRef.current !== null || saveState === 'saving') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveState])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  return { saveState, save, retry }
}
