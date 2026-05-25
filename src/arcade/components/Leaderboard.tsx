'use client'

import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { LeaderboardEntry } from '../lib/types'
import { getLeaderboard } from '../lib/api'
import { GAMES } from '../lib/games'
import { formatScore, timeAgo } from '../lib/utils'

const MEDALS = ['🥇', '🥈', '🥉']

interface Props {
  gameId?: string
}

export default function Leaderboard({ gameId: initialGameId }: Props) {
  const [activeGame, setActiveGame] = useState(initialGameId ?? GAMES[0].id)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getLeaderboard(activeGame)
      .then((data) => {
        setEntries(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load scores.')
        setLoading(false)
      })
  }, [activeGame])

  const tabs = GAMES.map((g) => ({ id: g.id, title: g.title }))

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="border-b border-[#2a2a2a] px-4 py-3 flex items-center gap-3 flex-shrink-0 bg-[#0a0a0a] z-10">
        <Link href="/">
          <button className="text-gray-400 hover:text-white transition-colors text-sm">← Back</button>
        </Link>
        <div className="h-4 w-px bg-[#2a2a2a]" />
        <span className="text-[#BE1E2E] text-sm select-none">♥</span>
        <h1 className="font-bold text-sm">Leaderboard</h1>
      </header>

      {/* Game filter tabs */}
      <div className="border-b border-[#2a2a2a] px-3 overflow-x-auto flex-shrink-0">
        <div className="flex gap-1 min-w-max py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveGame(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeGame === tab.id
                  ? 'bg-[#BE1E2E] text-white'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-[#1a1a1a]'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          {loading && (
            <div className="flex justify-center py-16">
              <span className="text-[#BE1E2E] animate-pulse text-5xl select-none">♥</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-gray-500 text-sm">{error}</div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-sm">No scores yet.</p>
              <p className="text-gray-600 text-xs mt-1">Be the first to play!</p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="space-y-1.5">
              {entries.map((entry, i) => {
                const isTop3 = i < 3

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isTop3
                        ? 'bg-[#1a1a1a] border border-[#2a2a2a]'
                        : 'hover:bg-[#111]'
                    }`}
                  >
                    <div className="w-8 text-center text-sm font-bold shrink-0">
                      {isTop3 ? (
                        <span>{MEDALS[i]}</span>
                      ) : (
                        <span className="text-gray-600">#{i + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{entry.displayName}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(entry.createdAt)}</p>
                    </div>

                    <div className="text-[#BE1E2E] font-bold text-sm tabular-nums shrink-0">
                      {formatScore(entry.score)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
