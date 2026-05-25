'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ArcadeState {
  displayName: string
  setDisplayName: (name: string) => void
}

export const useArcadeStore = create<ArcadeState>()(
  persist(
    (set) => ({
      displayName: '',
      setDisplayName: (name) => set({ displayName: name }),
    }),
    { name: 'arcade-display-name' }
  )
)

export function getGameSave<T = unknown>(gameId: string, userId: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`arcade-save-${gameId}-${userId}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function setGameSave<T = unknown>(gameId: string, userId: string, state: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`arcade-save-${gameId}-${userId}`, JSON.stringify(state))
}

export function clearGameSave(gameId: string, userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`arcade-save-${gameId}-${userId}`)
}
