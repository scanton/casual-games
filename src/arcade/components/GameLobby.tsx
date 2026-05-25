'use client'

import { Link } from 'wouter'
import { ArcadeUser } from '../lib/types'
import { GAMES } from '../lib/games'
import { useArcadeStore } from '../store/arcadeStore'
import GameCard from './GameCard'

interface Props {
  user: ArcadeUser
}

export default function GameLobby({ user }: Props) {
  const { displayName } = useArcadeStore()
  const greeting = displayName || user.displayName || user.email.split('@')[0]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="border-b border-[#2a2a2a] px-4 py-3 flex items-center justify-between flex-shrink-0 bg-[#0a0a0a] z-10">
        <div className="flex items-center gap-2">
          <span className="text-[#BE1E2E] text-xl leading-none select-none">♥</span>
          <h1 className="text-base font-bold tracking-widest uppercase text-white">Arcade</h1>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/leaderboard">
            <span className="text-gray-400 hover:text-white transition-colors text-sm cursor-pointer">
              Leaderboard
            </span>
          </Link>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <p className="text-gray-500 text-sm">
              Welcome back, <span className="text-white font-medium">{greeting}</span>
            </p>
            <h2 className="text-xl font-bold mt-1">Choose a Game</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {GAMES.map((game) => (
              <GameCard key={game.id} game={game} user={user} />
            ))}
          </div>
        </div>
      </main>

    </div>
  )
}
