import { GRID_COLS, GRID_ROWS, COLORS, HUD_TOP, type HeartColor } from './constants'
import type { HMState, Cell } from './types'
import { computeGridLayout, HINT_DELAY } from './logic'

// ── Heart shape ───────────────────────────────────────────────────────────────

const HEART_PTS: [number, number][] = []
for (let i = 0; i <= 80; i++) {
  const t = (i / 80) * Math.PI * 2
  HEART_PTS.push([
    16 * Math.sin(t) ** 3,
    -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 1.5,
  ])
}

function traceHeart(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath()
  for (let i = 0; i < HEART_PTS.length; i++) {
    const [x, y] = HEART_PTS[i]
    if (i === 0) ctx.moveTo(x, y)
    else         ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawHeartRaw(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, R: number,
  base: string, light: string,
  alpha = 1, scale = 1,
): void {
  const s = (R / 16) * scale
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  traceHeart(ctx)
  const g = ctx.createLinearGradient(-10, -14, 10, 12)
  g.addColorStop(0, light)
  g.addColorStop(1, base)
  ctx.fillStyle = g
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.beginPath()
  ctx.ellipse(-5, -8, 3, 4, -0.45, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawHeartColor(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, R: number,
  color: HeartColor,
  alpha = 1, scale = 1,
): void {
  const { base, light } = COLORS[color]
  drawHeartRaw(ctx, cx, cy, R, base, light, alpha, scale)
}

// ── Ice crystal (blocker tile) ────────────────────────────────────────────────

function drawIceCrystal(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  R: number,
  iceCount: number,
  cellSize: number,
): void {
  const arms    = 6
  const cracked = iceCount <= 1
  const alpha   = cracked ? 0.7 : 0.9

  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalAlpha = alpha

  // Soft glow background
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.05)
  glow.addColorStop(0, cracked ? 'rgba(147,197,253,0.35)' : 'rgba(191,219,254,0.5)')
  glow.addColorStop(1, 'rgba(219,234,254,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2)
  ctx.fill()

  // Snowflake arms
  ctx.strokeStyle = cracked ? '#93c5fd' : '#bfdbfe'
  ctx.lineWidth   = cellSize * 0.055
  ctx.lineCap     = 'round'
  ctx.beginPath()
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2
    // Main arm
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88)
    // Branch at 55%
    const bx = Math.cos(a) * R * 0.52
    const by = Math.sin(a) * R * 0.52
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + Math.cos(a + Math.PI / 3) * R * 0.28, by + Math.sin(a + Math.PI / 3) * R * 0.28)
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + Math.cos(a - Math.PI / 3) * R * 0.28, by + Math.sin(a - Math.PI / 3) * R * 0.28)
  }
  ctx.stroke()

  // Center gem
  ctx.fillStyle = cracked ? '#93c5fd' : '#dbeafe'
  ctx.beginPath()
  ctx.arc(0, 0, R * 0.16, 0, Math.PI * 2)
  ctx.fill()

  // Crack lines for damaged ice
  if (cracked) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth   = cellSize * 0.03
    ctx.beginPath()
    ctx.moveTo(-R * 0.28, -R * 0.45)
    ctx.lineTo( R * 0.08,  R * 0.12)
    ctx.lineTo( R * 0.42,  R * 0.48)
    ctx.stroke()
  }

  ctx.restore()
}

// ── Cell rendering ────────────────────────────────────────────────────────────

function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  cx: number, cy: number,
  cellSize: number,
  isSelected: boolean,
  isSwapping: boolean,
  time: number,
): void {
  const R = cellSize * 0.40

  // Popping animation: scale up + fade
  if (cell.popping) {
    const t = cell.popProgress
    drawHeartColor(ctx, cx, cy, R, cell.color, 1 - t, 1 + t * 0.5)
    return
  }

  // Locked ice tile — drawn as a snowflake/crystal, NOT a heart
  if (cell.locked) {
    drawIceCrystal(ctx, cx, cy, R, cell.iceCount, cellSize)
    return
  }

  // Power tile: pulsing glow + star badge
  if (cell.type === 'power') {
    const pulse = 0.25 + 0.15 * Math.sin(time * 6)
    ctx.save()
    ctx.shadowColor = COLORS[cell.color].light
    ctx.shadowBlur  = 14
    ctx.globalAlpha = pulse
    drawHeartColor(ctx, cx, cy, R * 1.22, cell.color)
    ctx.restore()
    drawHeartColor(ctx, cx, cy, R, cell.color)
    ctx.save()
    ctx.font         = `bold ${Math.round(R * 0.95)}px system-ui`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle    = 'rgba(255,255,255,0.85)'
    ctx.fillText('✦', cx, cy + 1)
    ctx.restore()
  }
  // Wild tile: rainbow shimmer
  else if (cell.type === 'wild') {
    const hue  = (time * 110) % 360
    const base  = `hsl(${hue},80%,50%)`
    const light = `hsl(${hue},100%,78%)`
    drawHeartRaw(ctx, cx, cy, R, base, light)
    ctx.save()
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + time * 1.8
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 4 + k * 1.57)
      ctx.fillStyle   = 'white'
      ctx.beginPath()
      ctx.arc(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  // Normal tile
  else {
    drawHeartColor(ctx, cx, cy, R, cell.color)
  }

  // Selection highlight
  if (isSelected) {
    const pulse = 0.65 + 0.3 * Math.sin(time * 7)
    ctx.save()
    ctx.shadowColor = 'white'
    ctx.shadowBlur  = 10
    ctx.strokeStyle = `rgba(255,255,255,${pulse})`
    ctx.lineWidth   = 2.5
    ctx.strokeRect(cx - cellSize * 0.47, cy - cellSize * 0.47, cellSize * 0.94, cellSize * 0.94)
    ctx.restore()
  }

  // Swap-target hint (adjacent to selected)
  if (isSwapping) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth   = 1.5
    ctx.setLineDash([3, 3])
    ctx.strokeRect(cx - cellSize * 0.44, cy - cellSize * 0.44, cellSize * 0.88, cellSize * 0.88)
    ctx.restore()
  }
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  state: HMState,
  gridX: number, gridY: number,
  cellSize: number,
): void {
  const gw = GRID_COLS * cellSize
  const gh = GRID_ROWS * cellSize

  // Cell backgrounds
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const x = gridX + c * cellSize
      const y = gridY + r * cellSize
      const even = (r + c) % 2 === 0
      ctx.fillStyle = even ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'
      ctx.fillRect(x, y, cellSize, cellSize)
    }
  }

  // Border glow
  ctx.save()
  ctx.shadowColor = 'rgba(190,30,46,0.5)'
  ctx.shadowBlur  = 10
  ctx.strokeStyle = 'rgba(190,30,46,0.35)'
  ctx.lineWidth   = 1.5
  ctx.strokeRect(gridX, gridY, gw, gh)
  ctx.restore()
}

function drawTiles(
  ctx: CanvasRenderingContext2D,
  state: HMState,
  gridX: number, gridY: number,
  cellSize: number,
): void {
  const selR = state.selected?.row ?? -1
  const selC = state.selected?.col ?? -1

  // Determine adjacent cells to selected (for swap hints)
  const adjacent = new Set<string>()
  if (state.selected) {
    const { row, col } = state.selected
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS)
        adjacent.add(`${nr},${nc}`)
    }
  }

  // Hint pair set (cells in the auto-hint)
  const hintSet = new Set<string>()
  if (state.hintPair && state.hintTimer >= HINT_DELAY) {
    for (const { row, col } of state.hintPair) hintSet.add(`${row},${col}`)
  }
  // Hint pulse: oscillate between 0.3 and 1.0
  const hintPulse = 0.65 + 0.35 * Math.sin(state.time * 4)

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cell = state.board[r][c]
      const baseCx = gridX + c * cellSize + cellSize / 2
      const baseCy = gridY + r * cellSize + cellSize / 2
      const cx = baseCx + cell.animOffsetX
      const cy = baseCy + cell.animOffsetY

      const isSelected = r === selR && c === selC
      const isSwapHint = state.phase === 'idle' && adjacent.has(`${r},${c}`)

      // Hint glow: pulsing golden ring around the suggested swap pair
      if (hintSet.has(`${r},${c}`) && !isSelected) {
        ctx.save()
        ctx.shadowColor = '#fbbf24'
        ctx.shadowBlur  = 16 * hintPulse
        ctx.strokeStyle = `rgba(251,191,36,${hintPulse})`
        ctx.lineWidth   = 3
        ctx.strokeRect(cx - cellSize * 0.47, cy - cellSize * 0.47, cellSize * 0.94, cellSize * 0.94)
        ctx.restore()
      }

      drawCell(ctx, cell, cx, cy, cellSize, isSelected, isSwapHint, state.time)
    }
  }
}

// ── HUD ───────────────────────────────────────────────────────────────────────

function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  state: HMState,
  cellSize: number,
): void {
  const fs   = Math.max(14, Math.round(cellSize * 0.52))   // main value
  const fsXs = Math.max(10, Math.round(cellSize * 0.38))   // inline label
  const pad  = 12

  // Background strip
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, w, HUD_TOP)

  // Progress bar sits at the bottom of the HUD strip
  const barH = 5
  const barY = HUD_TOP - 7
  const barX = pad
  const barW = w - pad * 2

  // Vertical centre of the text area (above the bar)
  const midY = barY / 2

  // ── Left: "[score] / [target]" on one line ────────────────────────────────
  const scoreStr  = state.levelScore.toLocaleString()
  const targetStr = ` / ${state.target.toLocaleString()}`

  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'
  ctx.font         = `bold ${fs}px system-ui`
  const scoreW     = ctx.measureText(scoreStr).width
  ctx.fillStyle    = 'rgba(255,255,255,0.92)'
  ctx.fillText(scoreStr, pad, midY)
  ctx.font         = `${fsXs}px system-ui`
  ctx.fillStyle    = 'rgba(255,255,255,0.48)'
  ctx.fillText(targetStr, pad + scoreW, midY)
  ctx.restore()

  // ── Right: "[moves] moves" on one line ───────────────────────────────────
  const movesStr = String(state.moves)
  const labelStr = ' moves'

  ctx.save()
  ctx.font      = `bold ${fs}px system-ui`
  const numW    = ctx.measureText(movesStr).width
  ctx.font      = `${fsXs}px system-ui`
  const lblW    = ctx.measureText(labelStr).width
  const startX  = w - pad - numW - lblW

  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'
  ctx.font         = `bold ${fs}px system-ui`
  ctx.fillStyle    = state.moves <= 5 ? '#f87171' : 'rgba(255,255,255,0.85)'
  ctx.fillText(movesStr, startX, midY)
  ctx.font         = `${fsXs}px system-ui`
  ctx.fillStyle    = 'rgba(255,255,255,0.42)'
  ctx.fillText(labelStr, startX + numW, midY)
  ctx.restore()

  // ── Centre: level ─────────────────────────────────────────────────────────
  ctx.save()
  ctx.fillStyle    = 'rgba(255,255,255,0.55)'
  ctx.font         = `${fsXs}px system-ui`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`LV.${state.level}`, w / 2, midY)
  ctx.restore()

  // ── Progress bar ──────────────────────────────────────────────────────────
  const pct = Math.min(1, state.levelScore / state.target)

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath()
  ctx.roundRect(barX, barY, barW, barH, 2)
  ctx.fill()

  if (pct > 0) {
    const g = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0)
    g.addColorStop(0, '#e91e8c')
    g.addColorStop(1, pct > 0.7 ? '#fcd34d' : '#f472b6')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(barX, barY, barW * pct, barH, 2)
    ctx.fill()
  }
  ctx.restore()
}

// ── Level banner ──────────────────────────────────────────────────────────────

function drawLevelBanner(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: HMState,
  cellSize: number,
): void {
  if (state.levelBanner <= 0) return
  const elapsed = 2.5 - state.levelBanner
  const alpha   = elapsed < 0.25 ? elapsed / 0.25 : state.levelBanner < 0.45 ? state.levelBanner / 0.45 : 1
  const fs      = Math.min(30, Math.max(15, Math.round(cellSize * 0.58)))

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle   = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, h / 2 - fs * 1.2, w, fs * 2.4)
  ctx.fillStyle    = '#FCD34D'
  ctx.font         = `bold ${fs}px system-ui`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(state.levelBannerText, w / 2, h / 2)
  ctx.restore()
}

// ── Particles & floating text ─────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, state: HMState): void {
  for (const p of state.particles) {
    ctx.save()
    ctx.globalAlpha = p.alpha
    ctx.fillStyle   = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, state: HMState, cellSize: number): void {
  const fs = Math.max(11, Math.round(cellSize * 0.68))
  for (const ft of state.floatingTexts) {
    ctx.save()
    ctx.globalAlpha  = ft.alpha
    ctx.fillStyle    = ft.color
    ctx.font         = `bold ${fs}px system-ui`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(ft.text, ft.x, ft.y)
    ctx.restore()
  }
}

// ── Full scene ────────────────────────────────────────────────────────────────

export function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: HMState,
): void {
  ctx.clearRect(0, 0, w, h)

  const { cellSize, gridX, gridY } = computeGridLayout(w, h)

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#0f0508')
  bg.addColorStop(1, '#1a0812')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Shake transform
  if (state.shakeX !== 0 || state.shakeY !== 0) ctx.translate(state.shakeX, state.shakeY)

  drawGrid(ctx, state, gridX, gridY, cellSize)
  drawTiles(ctx, state, gridX, gridY, cellSize)
  drawParticles(ctx, state)
  drawFloatingTexts(ctx, state, cellSize)

  if (state.shakeX !== 0 || state.shakeY !== 0) ctx.resetTransform()

  drawHUD(ctx, w, state, cellSize)
  drawLevelBanner(ctx, w, h, state, cellSize)
}
