'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { GameProps } from '../../lib/types'
import { initGame, updateGame, trySwap, advanceLevel, serializeState, computeGridLayout } from './logic'
import { drawScene } from './renderer'
import type { HMState, SavedHMState } from './types'
import { GRID_COLS, GRID_ROWS } from './constants'

export default function HeartMatch({ savedState, onSaveState, onGameOver }: GameProps) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const stateRef         = useRef<HMState | null>(null)
  const rafRef           = useRef<number>(0)
  const lastTimeRef      = useRef(0)
  const gameOverFiredRef = useRef(false)
  const pausedRef        = useRef(false)

  const [overlay, setOverlay] = useState<'none' | 'over'>('none')

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = initGame(savedState as SavedHMState | null)
    gameOverFiredRef.current = false
    setOverlay('none')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas sizing ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
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
        // Auto-advance: levelWonTimer hit 0 → advance without any overlay
        if (s.levelWon && s.levelWonTimer <= 0) {
          stateRef.current = advanceLevel(s)
          gameOverFiredRef.current = false
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

  // ── Coordinate helpers ────────────────────────────────────────────────────
  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const src    = 'touches' in e ? (e.touches[0] ?? e.changedTouches[0]) : e
    const scaleX = canvas.width  / (rect.width  || canvas.offsetWidth)
    const scaleY = canvas.height / (rect.height || canvas.offsetHeight)
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY }
  }, [])

  const posToCell = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current!
    const { cellSize, gridX, gridY } = computeGridLayout(canvas.width, canvas.height)
    const col = Math.floor((x - gridX) / cellSize)
    const row = Math.floor((y - gridY) / cellSize)
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null
    return { row, col, cellSize }
  }, [])

  // ── Tap / click logic ─────────────────────────────────────────────────────
  const handleCellTap = useCallback((row: number, col: number) => {
    const s = stateRef.current
    if (!s || s.gameOver || s.levelWon || s.phase !== 'idle') return

    const canvas = canvasRef.current!
    const { cellSize } = computeGridLayout(canvas.width, canvas.height)

    if (!s.selected) {
      s.selected = { row, col }
    } else if (s.selected.row === row && s.selected.col === col) {
      s.selected = null
    } else {
      const dr = Math.abs(row - s.selected.row)
      const dc = Math.abs(col - s.selected.col)
      if (dr + dc === 1) {
        trySwap(s, s.selected.row, s.selected.col, row, col, cellSize)
        s.selected = null
      } else {
        s.selected = { row, col }
      }
    }
  }, [])

  const onClick = useCallback((e: React.MouseEvent) => {
    const pos  = getCanvasPos(e)
    const cell = posToCell(pos.x, pos.y)
    if (cell) handleCellTap(cell.row, cell.col)
  }, [getCanvasPos, posToCell, handleCellTap])

  const touchStartRef = useRef<{ x: number; y: number; row: number; col: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const pos  = getCanvasPos(e)
    const cell = posToCell(pos.x, pos.y)
    touchStartRef.current = cell ? { ...pos, row: cell.row, col: cell.col } : null
  }, [getCanvasPos, posToCell])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return

    const end  = getCanvasPos(e)
    const dx   = end.x - start.x
    const dy   = end.y - start.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const s = stateRef.current
    if (!s || s.phase !== 'idle') return

    const canvas = canvasRef.current!
    const { cellSize } = computeGridLayout(canvas.width, canvas.height)

    if (dist < 14) {
      handleCellTap(start.row, start.col)
    } else if (dist > cellSize * 0.3) {
      // Swipe: determine target cell from direction
      let tRow = start.row, tCol = start.col
      if (Math.abs(dx) > Math.abs(dy)) tCol += dx > 0 ? 1 : -1
      else                              tRow += dy > 0 ? 1 : -1

      if (tRow >= 0 && tRow < GRID_ROWS && tCol >= 0 && tCol < GRID_COLS) {
        trySwap(s, start.row, start.col, tRow, tCol, cellSize)
        s.selected = null
      }
    }
  }, [getCanvasPos, posToCell, handleCellTap])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); pausedRef.current = !pausedRef.current; return }

      const s = stateRef.current
      if (!s || s.phase !== 'idle' || s.gameOver || s.levelWon) return

      if (e.key === 'Escape') { e.preventDefault(); s.selected = null; return }

      const DIR: Record<string, [number, number]> = {
        ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1],
        w: [-1,0], s: [1,0], a: [0,-1], d: [0,1],
        W: [-1,0], S: [1,0], A: [0,-1], D: [0,1],
      }
      const dir = DIR[e.key]
      if (!dir) return
      e.preventDefault()

      const canvas = canvasRef.current!
      const { cellSize } = computeGridLayout(canvas.width, canvas.height)

      if (!s.selected) {
        s.selected = { row: Math.floor(GRID_ROWS / 2), col: Math.floor(GRID_COLS / 2) }
      } else if (e.shiftKey) {
        const [dr, dc] = dir
        const nr = s.selected.row + dr, nc = s.selected.col + dc
        if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
          trySwap(s, s.selected.row, s.selected.col, nr, nc, cellSize)
          s.selected = null
        }
      } else {
        const [dr, dc] = dir
        s.selected = {
          row: Math.max(0, Math.min(GRID_ROWS - 1, s.selected.row + dr)),
          col: Math.max(0, Math.min(GRID_COLS - 1, s.selected.col + dc)),
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full h-full select-none touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: 'pointer' }}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      />

      {overlay === 'over' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <p className="text-5xl mb-2 select-none">💔</p>
            <p className="text-xl font-bold text-white">Game Over</p>
          </div>
        </div>
      )}
    </div>
  )
}
