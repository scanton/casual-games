'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { GameProps } from '../../lib/types'
import { initGame, updateGame, shoot, serializeState } from './logic'
import { drawScene } from './renderer'
import type { HBState } from './types'
import type { SavedHBState } from './types'

function computeR(w: number, h: number): number {
  const byW = w / 22        // fits 8 even-row hearts with comfortable margin
  const byH = h / 20        // leaves room for shooter
  return Math.max(Math.min(byW, byH, 34), 14)
}

const TOP_PAD = 6

export default function HeartBreaker({ savedState, onSaveState, onGameOver }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<HBState | null>(null)
  const rafRef = useRef<number>(0)
  const aimRef = useRef({ x: 0, y: 0 })
  const lastTimeRef = useRef(0)
  const gameOverFiredRef = useRef(false)

  const [overlay, setOverlay] = useState<'none' | 'over' | 'won'>('none')

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = initGame(savedState as SavedHBState | null)
    gameOverFiredRef.current = false
    setOverlay('none')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return

    const sync = () => {
      canvas.width = el.clientWidth
      canvas.height = el.clientHeight
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current!

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time

      const s = stateRef.current
      if (!s || canvas.width === 0) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const R = computeR(canvas.width, canvas.height)
      const ctx = canvas.getContext('2d')!

      if (!s.gameOver) {
        updateGame(s, dt, canvas.width, canvas.height, R, TOP_PAD)
      }

      drawScene(ctx, canvas.width, canvas.height, s, R, TOP_PAD, aimRef.current.x, aimRef.current.y)

      if (s.hudDirty) {
        s.hudDirty = false
        if (s.gameOver && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true
          setOverlay(s.won ? 'won' : 'over')
          onGameOver(s.score)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [onGameOver])

  // ── Auto-save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (stateRef.current && !stateRef.current.gameOver) {
        onSaveState(serializeState(stateRef.current))
      }
    }, 8000)
    return () => clearInterval(id)
  }, [onSaveState])

  // ── Input ─────────────────────────────────────────────────────────────────
  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const src = 'touches' in e ? e.touches[0] ?? e.changedTouches[0] : e
    const displayW = rect.width || canvas.offsetWidth || canvas.width
    const displayH = rect.height || canvas.offsetHeight || canvas.height
    return {
      x: (src.clientX - rect.left) * (canvas.width / displayW),
      y: (src.clientY - rect.top) * (canvas.height / displayH),
    }
  }, [])

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    aimRef.current = getPos(e)
  }, [getPos])

  const handleFire = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const s = stateRef.current
    if (!s || s.gameOver) return
    const canvas = canvasRef.current!
    const R = computeR(canvas.width, canvas.height)
    const pos = getPos(e)
    shoot(s, pos.x, pos.y, canvas.width / 2, canvas.height - R * 3)
    aimRef.current = pos
  }, [getPos])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full h-full select-none touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseMove={handleMove}
        onClick={handleFire}
        onTouchMove={(e) => { e.preventDefault(); handleMove(e) }}
        onTouchEnd={(e) => { e.preventDefault(); handleFire(e) }}
        style={{ cursor: 'crosshair' }}
      />

      {/* Game-over / win overlay rendered in DOM for accessibility */}
      {overlay !== 'none' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <p className="text-5xl mb-2 select-none">♥</p>
            <p className="text-xl font-bold text-white">
              {overlay === 'won' ? 'Cleared!' : 'Game Over'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
