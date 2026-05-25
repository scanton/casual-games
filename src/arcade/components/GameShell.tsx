'use client'

import { useState, useEffect, Suspense } from 'react'
import { Link, useLocation } from 'wouter'
import { ArcadeUser } from '../lib/types'
import { getGame } from '../lib/games'
import { getGameSave, setGameSave, clearGameSave } from '../store/arcadeStore'
import ScoreModal from './ScoreModal'

interface Props {
  user: ArcadeUser
  gameId: string
}

export default function GameShell({ user, gameId }: Props) {
  const game = getGame(gameId)
  const [, navigate] = useLocation()
  const [savedState, setSavedState] = useState<unknown>(null)
  const [showScore, setShowScore] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [playCount, setPlayCount] = useState(0)

  useEffect(() => {
    setSavedState(getGameSave(gameId, user.id))
    setLoaded(true)
  }, [gameId, user.id])

  if (!game) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-sm">Game not found.</p>
        <Link href="/">
          <button className="text-[#BE1E2E] text-sm hover:underline">← Back to Arcade</button>
        </Link>
      </div>
    )
  }

  const GameComponent = game.component

  function handleSaveState(state: unknown) {
    setGameSave(gameId, user.id, state)
    setSavedState(state)
  }

  function handleGameOver(score: number) {
    clearGameSave(gameId, user.id)
    setSavedState(null)
    setFinalScore(score)
    setShowScore(true)
  }

  function handlePlayAgain() {
    setShowScore(false)
    setFinalScore(0)
    setPlayCount(c => c + 1)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="border-b border-[#2a2a2a] px-4 py-3 flex items-center gap-3 flex-shrink-0 bg-[#0a0a0a] z-10">
        <Link href="/">
          <button className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
            ← Back
          </button>
        </Link>
        <div className="h-4 w-px bg-[#2a2a2a]" />
        <span className="text-[#BE1E2E] text-sm select-none">♥</span>
        <h1 className="font-bold text-sm">{game.title}</h1>
      </header>

      <main className="flex-1 overflow-y-auto">
        {loaded ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <span className="text-[#BE1E2E] animate-pulse text-5xl select-none">♥</span>
              </div>
            }
          >
            <GameComponent
              key={playCount}
              user={user}
              savedState={savedState}
              onSaveState={handleSaveState}
              onGameOver={handleGameOver}
            />
          </Suspense>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <span className="text-[#BE1E2E] animate-pulse text-5xl select-none">♥</span>
          </div>
        )}
      </main>

      {showScore && (
        <ScoreModal
          user={user}
          gameId={gameId}
          gameName={game.title}
          score={finalScore}
          onPlayAgain={handlePlayAgain}
          onClose={() => navigate('/')}
        />
      )}
    </div>
  )
}
