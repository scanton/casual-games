'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { GameProps } from '../../lib/types'
import { initGame, updateGame, enqueueDir, serializeState, computeGridLayout } from './logic'
import { drawScene } from './renderer'
import type { HSState, Direction, SavedHSState } from './types'

export default function HeartStrings({ savedState, onSaveState, onGameOver }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const stateRef     = useRef<HSState | null>(null)
  const rafRef       = useRef<number>(0)
  const lastTimeRef  = useRef(0)
  const gameOverFiredRef = useRef(false)
  const pausedRef        = useRef(false)

  const [overlay, setOverlay] = useState<'none' | 'over'>('none')

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = initGame(savedState as SavedHSState | null)
    gameOverFiredRef.current = false
    setOverlay('none')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas sizing ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el     = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    const sync = () => { canvas.width = el.clientWidth; canvas.height = el.clientHeight }
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
      if (!s || canvas.width === 0) { rafRef.current = requestAnimationFrame(loop); return }

      if (!pausedRef.current) updateGame(s, dt, canvas.width, canvas.height)

      const ctx = canvas.getContext('2d')!
      drawScene(ctx, canvas.width, canvas.height, s)

      if (s.hudDirty) {
        s.hudDirty = false
        if (s.gameOver && !gameOverFiredRef.current) {
          gameOverFiredRef.current = true
          setOverlay('over')
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
      const s = stateRef.current
      if (s && !s.gameOver) onSaveState(serializeState(s))
    }, 8000)
    return () => clearInterval(id)
  }, [onSaveState])

  // ── Keyboard input ────────────────────────────────────────────────────────
  useEffect(() => {
    const KEY_MAP: Record<string, Direction> = {
      ArrowUp: 'up',    w: 'up',    W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); pausedRef.current = !pausedRef.current; return }
      const dir = KEY_MAP[e.key]
      if (dir) { e.preventDefault(); const s = stateRef.current; if (s && !s.gameOver) enqueueDir(s, dir) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Touch / click input ───────────────────────────────────────────────────
  // Tap anywhere: direction determined by tap position relative to snake head
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const src    = 'touches' in e ? (e.touches[0] ?? e.changedTouches[0]) : e
    const scaleX = canvas.width  / (rect.width  || canvas.offsetWidth  || canvas.width)
    const scaleY = canvas.height / (rect.height || canvas.offsetHeight || canvas.height)
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY }
  }, [])

  const handleTapDir = useCallback((cx: number, cy: number) => {
    const s = stateRef.current
    if (!s || s.gameOver) return
    // Find head visual center (approximate: grid center of head segment)
    const canvas = canvasRef.current!
    const { cellSize, gridX, gridY } = computeGridLayout(canvas.width, canvas.height)
    const head = s.segments[0]
    const hx   = gridX + head.col * cellSize + cellSize / 2
    const hy   = gridY + head.row * cellSize + cellSize / 2
    const dx   = cx - hx
    const dy   = cy - hy
    if (Math.abs(dx) > Math.abs(dy)) {
      enqueueDir(s, dx > 0 ? 'right' : 'left')
    } else {
      enqueueDir(s, dy > 0 ? 'down' : 'up')
    }
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const pos = getCanvasPos(e)
    touchStartRef.current = pos
  }, [getCanvasPos])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const end   = getCanvasPos(e)
    const start = touchStartRef.current
    if (!start) return
    touchStartRef.current = null
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 12) {
      // Tap: direction toward tap from head
      handleTapDir(end.x, end.y)
    } else {
      // Swipe: direction of swipe
      const s = stateRef.current
      if (!s || s.gameOver) return
      if (Math.abs(dx) > Math.abs(dy)) {
        enqueueDir(s, dx > 0 ? 'right' : 'left')
      } else {
        enqueueDir(s, dy > 0 ? 'down' : 'up')
      }
    }
  }, [getCanvasPos, handleTapDir])

  const onClick = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e)
    handleTapDir(pos.x, pos.y)
  }, [getCanvasPos, handleTapDir])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full h-full select-none touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: 'crosshair' }}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      />

      {overlay === 'over' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <p className="text-5xl mb-2 select-none">♥</p>
            <p className="text-xl font-bold text-white">Game Over</p>
          </div>
        </div>
      )}
    </div>
  )
}
