'use client'

import { GameProps } from '../lib/types'
import { formatScore } from '../lib/utils'

interface PlaceholderProps extends GameProps {
  title: string
  description: string
  devScore: number
}

export default function GamePlaceholder({
  title,
  description,
  devScore,
  onGameOver,
}: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8 text-center">
      <div className="relative">
        <span className="text-8xl select-none" style={{ filter: 'drop-shadow(0 0 24px #BE1E2E88)' }}>
          ♥
        </span>
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-gray-400 max-w-xs text-sm leading-relaxed">{description}</p>
      </div>
      <div className="border border-[#2a2a2a] rounded-xl px-6 py-3 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Coming Soon</p>
        <p className="text-gray-400 text-sm">This game is under development</p>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => onGameOver(devScore)}
          className="mt-4 px-5 py-2 bg-[#1a1a1a] border border-[#3a3a3a] hover:border-[#BE1E2E] text-gray-400 hover:text-white text-xs rounded-lg transition-colors"
        >
          ⚙ Simulate Game Over ({formatScore(devScore)} pts)
        </button>
      )}
    </div>
  )
}
