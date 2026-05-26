'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Link } from 'wouter'
import { GameConfig, ArcadeUser } from '../lib/types'
import { getGameSave } from '../store/arcadeStore'
import { cn } from '../lib/utils'

const THUMBNAIL_GRADIENTS: Record<string, string> = {
  heartmatch:   'from-[#BE1E2E] via-[#8b1520] to-[#2a0508]',
  heartbreaker: 'from-[#c42d3e] via-[#6b0f1a] to-[#1a0205]',
  heartstrings: 'from-[#a01828] via-[#5a0d15] to-[#150305]',
  heartbeat:    'from-[#d4304a] via-[#921828] to-[#200508]',
}

interface Props {
  game: GameConfig
  user: ArcadeUser
}

export default function GameCard({ game, user }: Props) {
  const [hasSave, setHasSave] = useState(false)

  useEffect(() => {
    setHasSave(!!getGameSave(game.id, user.id))
  }, [game.id, user.id])

  const gradient = THUMBNAIL_GRADIENTS[game.id] ?? 'from-[#BE1E2E] to-[#1a0508]'

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden bg-[#1a1a1a] border transition-all duration-200 group flex flex-col',
        game.available
          ? 'border-[#2a2a2a] hover:border-[#BE1E2E] hover:shadow-[0_0_20px_rgba(190,30,46,0.15)]'
          : 'border-[#1e1e1e] opacity-75'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden flex-shrink-0">
        {game.thumbnail ? (
          <Image
            src={game.thumbnail}
            alt={game.title}
            fill
            className="object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <span
              className="text-5xl select-none transition-all duration-300 opacity-20 group-hover:opacity-40 group-hover:scale-110"
            >
              ♥
            </span>
          </div>
        )}

        {!game.available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border border-gray-700 px-2.5 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
        )}

        {hasSave && game.available && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] bg-[#BE1E2E] text-white px-2 py-0.5 rounded-full font-semibold">
              Saved
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h2 className="font-bold text-sm mb-1 text-white">{game.title}</h2>
        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-3 flex-1">
          {game.description}
        </p>

        {game.available ? (
          <Link href={`/games/${game.id}`}>
            <button className="w-full py-1.5 bg-[#BE1E2E] hover:bg-[#d42234] active:bg-[#a01828] text-white text-xs font-bold rounded-lg transition-colors">
              {hasSave ? 'Continue ♥' : 'Play'}
            </button>
          </Link>
        ) : (
          <button
            disabled
            className="w-full py-1.5 bg-[#1e1e1e] text-gray-700 text-xs font-bold rounded-lg cursor-not-allowed"
          >
            Play
          </button>
        )}
      </div>
    </div>
  )
}
