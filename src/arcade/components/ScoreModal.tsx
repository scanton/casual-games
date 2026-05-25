'use client'

import { useState } from 'react'
import { ArcadeUser } from '../lib/types'
import { useArcadeStore } from '../store/arcadeStore'
import { submitScore } from '../lib/api'
import { formatScore } from '../lib/utils'

interface Props {
  user: ArcadeUser
  gameId: string
  gameName: string
  score: number
  onPlayAgain: () => void
  onClose: () => void
}

export default function ScoreModal({ user, gameId, gameName, score, onPlayAgain, onClose }: Props) {
  const { displayName, setDisplayName } = useArcadeStore()
  const [name, setName] = useState(
    displayName || user.displayName || user.email.split('@')[0]
  )
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      setDisplayName(name.trim())
      await submitScore({ userId: user.id, displayName: name.trim(), gameId, score })
      setSubmitted(true)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
        <div
          className="text-6xl mb-4 select-none"
          style={{ filter: 'drop-shadow(0 0 16px #BE1E2E66)' }}
        >
          ♥
        </div>

        <h2 className="text-xl font-bold mb-1">Game Over</h2>
        <p className="text-gray-500 text-sm mb-5">{gameName}</p>

        <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Your Score</p>
          <p className="text-3xl font-bold text-[#BE1E2E]">{formatScore(score)}</p>
        </div>

        {!submitted ? (
          <>
            <div className="mb-4 text-left">
              <label className="text-xs text-gray-400 block mb-1.5">
                Display name for leaderboard
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                maxLength={20}
                placeholder="Your name..."
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] focus:border-[#BE1E2E] rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
              />
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim()}
              className="w-full py-2.5 bg-[#BE1E2E] hover:bg-[#d42234] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl mb-3 transition-colors text-sm"
            >
              {submitting ? 'Submitting…' : 'Submit Score'}
            </button>
          </>
        ) : (
          <div className="mb-6 py-3">
            <p className="text-green-400 text-sm font-medium">✓ Score submitted!</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-2 border border-[#2a2a2a] hover:border-[#BE1E2E] text-gray-300 hover:text-white rounded-xl text-sm transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#2a2a2a] hover:border-[#BE1E2E] text-gray-300 hover:text-white rounded-xl text-sm transition-colors"
          >
            Lobby
          </button>
        </div>
      </div>
    </div>
  )
}
