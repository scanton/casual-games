import { GRID_COLS, GRID_ROWS, COLORS, HEART_COLORS, WRAP_LEVEL, ARROW_LIFETIME, type HeartColor } from './constants'
import type { HSState, Food } from './types'
import { computeGridLayout } from './logic'

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
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function drawHeartRaw(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  R: number,
  base: string,
  light: string,
  alpha = 1,
  scale = 1,
  rotation = 0,
): void {
  const s = (R / 16) * scale
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, cy)
  if (rotation) ctx.rotate(rotation)
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
  cx: number, cy: number,
  R: number,
  color: HeartColor,
  alpha = 1,
  scale = 1,
  rotation = 0,
): void {
  const { base, light } = COLORS[color]
  drawHeartRaw(ctx, cx, cy, R, base, light, alpha, scale, rotation)
}

// ── Rainbow helpers ───────────────────────────────────────────────────────────

function rainbowColors(t: number, i: number): [string, string] {
  const hue = (t * 160 + i * 30) % 360
  return [`hsl(${hue},80%,50%)`, `hsl(${hue},100%,78%)`]
}

// ── Interpolated segment position ─────────────────────────────────────────────

function segVisualPos(
  i: number,
  state: HSState,
  gridX: number, gridY: number, cellSize: number,
): { x: number; y: number } {
  const cur  = state.segments[i]
  const prev = state.prevSegments[i]
  const t    = state.moveProgress

  if (!prev || !cur) {
    const s = cur ?? state.segments[0]
    return { x: gridX + s.col * cellSize + cellSize / 2, y: gridY + s.row * cellSize + cellSize / 2 }
  }

  // Detect wrap-around (col/row jump > 1) — snap instead of lerp to avoid streaking
  const dc = cur.col - prev.col
  const dr = cur.row - prev.row
  if (Math.abs(dc) > 1 || Math.abs(dr) > 1) {
    return { x: gridX + cur.col * cellSize + cellSize / 2, y: gridY + cur.row * cellSize + cellSize / 2 }
  }

  return {
    x: gridX + (prev.col + dc * t) * cellSize + cellSize / 2,
    y: gridY + (prev.row + dr * t) * cellSize + cellSize / 2,
  }
}

// ── Draw snake ────────────────────────────────────────────────────────────────

function drawSnake(
  ctx: CanvasRenderingContext2D,
  state: HSState,
  gridX: number, gridY: number,
  cellSize: number,
): void {
  const n = state.segments.length
  if (n === 0) return
  const R = cellSize * 0.4
  const isRainbow = state.rainbowTimer > 0
  const pulseScale = state.pulseTimer > 0 ? 1 + state.pulseTimer * 0.18 : 1

  // Pre-compute visual positions
  const pts = Array.from({ length: n }, (_, i) => segVisualPos(i, state, gridX, gridY, cellSize))

  // ── Draw strings first (thin glowing lines between hearts) ───────────────
  for (let i = 0; i < n - 1; i++) {
    const { x: x1, y: y1 } = pts[i]
    const { x: x2, y: y2 } = pts[i + 1]

    let strokeColor: string
    if (isRainbow) {
      const hue = (state.time * 160 + i * 30) % 360
      strokeColor = `hsla(${hue},100%,70%,0.55)`
    } else {
      const col = COLORS[HEART_COLORS[i % HEART_COLORS.length]].base
      strokeColor = col + '88'  // ~53% alpha
    }

    ctx.save()
    ctx.strokeStyle = strokeColor
    ctx.lineWidth   = cellSize * 0.13
    ctx.lineCap     = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    ctx.restore()
  }

  // ── Draw segment hearts (tail → head so head is on top) ──────────────────
  for (let i = n - 1; i >= 0; i--) {
    const { x, y } = pts[i]
    const isHead   = i === 0
    const scale    = (isHead ? 1.1 : 1.0) * pulseScale

    if (isRainbow) {
      const [base, light] = rainbowColors(state.time, i)
      drawHeartRaw(ctx, x, y, R, base, light, 1, scale)
      if (isHead) {
        // Pulsing glow on head during rainbow
        ctx.save()
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(state.time * 8)
        ctx.shadowColor = '#FF69B4'
        ctx.shadowBlur  = 18
        drawHeartRaw(ctx, x, y, R, '#FF69B4', '#FFB6C1', 1, scale * 1.05)
        ctx.restore()
      }
    } else {
      const color = HEART_COLORS[i % HEART_COLORS.length]
      drawHeartColor(ctx, x, y, R, color, 1, scale)
    }
  }
}

// ── Draw food items ───────────────────────────────────────────────────────────

function drawFoods(
  ctx: CanvasRenderingContext2D,
  state: HSState,
  gridX: number, gridY: number,
  cellSize: number,
): void {
  const R = cellSize * 0.4
  for (const food of state.foods) {
    const cx = gridX + food.col * cellSize + cellSize / 2
    const cy = gridY + food.row * cellSize + cellSize / 2

    switch (food.type) {
      case 'love': {
        const scale = 0.88 + 0.12 * Math.sin(food.animPhase)
        // Outer glow ring
        ctx.save()
        ctx.globalAlpha = 0.18 + 0.1 * Math.sin(food.animPhase)
        ctx.fillStyle = COLORS.pink.light
        ctx.beginPath()
        ctx.arc(cx, cy, R * 1.5 * scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        drawHeartColor(ctx, cx, cy, R, 'pink', 1, scale)
        break
      }
      case 'passion': {
        const spin = food.animPhase * 1.2
        drawHeartColor(ctx, cx, cy, R, 'coral', 1, 1, spin)
        // Small orbit sparkles
        ctx.save()
        ctx.fillStyle = COLORS.coral.light
        for (let k = 0; k < 3; k++) {
          const a  = spin + (k / 3) * Math.PI * 2
          const ox = Math.cos(a) * R * 1.4
          const oy = Math.sin(a) * R * 1.4
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.arc(cx + ox, cy + oy, R * 0.2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        break
      }
      case 'heartbreak': {
        // Grey-washed purple heart
        drawHeartColor(ctx, cx, cy, R, 'purple', 0.9, 1, 0.08 * Math.sin(food.animPhase * 0.7))
        // Crack lines
        ctx.save()
        ctx.translate(cx, cy)
        const s = R / 16
        ctx.strokeStyle = 'rgba(0,0,0,0.65)'
        ctx.lineWidth = 1.2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(-3 * s, -8 * s)
        ctx.lineTo( 0 * s, -3 * s)
        ctx.lineTo(-2 * s,  1 * s)
        ctx.lineTo( 1 * s,  6 * s)
        ctx.stroke()
        ctx.restore()
        break
      }
      case 'arrow': {
        const nearExpiry = food.age > ARROW_LIFETIME * 0.65
        const flashAlpha = nearExpiry
          ? 0.5 + 0.5 * Math.sin(food.animPhase * 4)
          : 1
        drawHeartColor(ctx, cx, cy, R, 'gold', flashAlpha)
        // 4 sparkle lines
        ctx.save()
        ctx.strokeStyle = COLORS.gold.light
        ctx.lineWidth = 1.5
        ctx.globalAlpha = flashAlpha * 0.8
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + food.animPhase * 0.4
          const r1 = R * 1.25
          const r2 = R * 1.9
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
          ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
          ctx.stroke()
        }
        ctx.restore()
        break
      }
    }
  }
}

// ── Background & grid ─────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#0f0508')
  g.addColorStop(1, '#1a0a10')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function drawPlayfield(
  ctx: CanvasRenderingContext2D,
  state: HSState,
  gridX: number, gridY: number,
  cellSize: number,
): void {
  const gw = GRID_COLS * cellSize
  const gh = GRID_ROWS * cellSize
  const wrap = state.level >= WRAP_LEVEL

  // Very faint grid lines
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth   = 0.5
  ctx.beginPath()
  for (let c = 0; c <= GRID_COLS; c++) {
    ctx.moveTo(gridX + c * cellSize, gridY)
    ctx.lineTo(gridX + c * cellSize, gridY + gh)
  }
  for (let r = 0; r <= GRID_ROWS; r++) {
    ctx.moveTo(gridX,      gridY + r * cellSize)
    ctx.lineTo(gridX + gw, gridY + r * cellSize)
  }
  ctx.stroke()
  ctx.restore()

  // Border glow: red = danger, teal = safe wrap
  const borderColor = wrap ? 'rgba(45,212,191,0.45)' : 'rgba(190,30,46,0.45)'
  const glowColor   = wrap ? 'rgba(45,212,191,0.7)'  : 'rgba(190,30,46,0.7)'
  ctx.save()
  ctx.shadowColor = glowColor
  ctx.shadowBlur  = 12
  ctx.strokeStyle = borderColor
  ctx.lineWidth   = 2
  ctx.strokeRect(gridX, gridY, gw, gh)
  ctx.restore()
}

// ── HUD ───────────────────────────────────────────────────────────────────────

function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: HSState,
  gridX: number, gridY: number,
  cellSize: number,
): void {
  const gw       = GRID_COLS * cellSize
  const gh       = GRID_ROWS * cellSize
  const hudY     = gridY + gh + 8
  const fontSize = Math.max(13, Math.round(cellSize * 0.78))
  const smallFs  = Math.max(11, Math.round(cellSize * 0.58))

  // Score
  ctx.save()
  ctx.fillStyle    = 'rgba(255,255,255,0.85)'
  ctx.font         = `bold ${fontSize}px system-ui`
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(state.score.toLocaleString(), gridX, hudY)
  ctx.restore()

  // Level
  ctx.save()
  ctx.fillStyle    = 'rgba(255,255,255,0.55)'
  ctx.font         = `${smallFs}px system-ui`
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(`LV.${state.level}`, gridX + gw, hudY)
  ctx.restore()

  // Combo badge
  if (state.combo > 1 && state.comboTimer > 0) {
    ctx.save()
    ctx.fillStyle    = '#FCD34D'
    ctx.font         = `bold ${smallFs}px system-ui`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(`×${state.combo} COMBO`, gridX + gw / 2, hudY)
    ctx.restore()
  }

  // Rainbow indicator
  if (state.rainbowTimer > 0) {
    const hue = (state.time * 160) % 360
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 7)
    ctx.save()
    ctx.globalAlpha  = pulse
    ctx.fillStyle    = `hsl(${hue},100%,72%)`
    ctx.font         = `bold ${smallFs}px system-ui`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('✨ RAINBOW HEART ✨', w / 2, gridY - 4)
    ctx.restore()
  }
}

// ── Level banner ──────────────────────────────────────────────────────────────

function drawLevelBanner(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: HSState,
  cellSize: number,
): void {
  if (state.levelBanner <= 0) return
  const elapsed = 2.5 - state.levelBanner
  const alpha = elapsed < 0.25
    ? elapsed / 0.25
    : state.levelBanner < 0.45
      ? state.levelBanner / 0.45
      : 1

  const isWrap   = state.levelBannerText.includes('WRAP')
  const fontSize = Math.max(18, Math.round(cellSize * 1.3))

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle   = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, h / 2 - fontSize * 1.4, w, fontSize * 2.8)

  ctx.fillStyle    = isWrap ? '#2DD4BF' : '#FCD34D'
  ctx.font         = `bold ${fontSize}px system-ui`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(state.levelBannerText, w / 2, h / 2)
  ctx.restore()
}

// ── Particles & floating text ─────────────────────────────────────────────────

function drawParticles(ctx: CanvasRenderingContext2D, state: HSState): void {
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

function drawFloatingTexts(ctx: CanvasRenderingContext2D, state: HSState, cellSize: number): void {
  const fontSize = Math.max(11, Math.round(cellSize * 0.7))
  for (const ft of state.floatingTexts) {
    ctx.save()
    ctx.globalAlpha  = ft.alpha
    ctx.fillStyle    = ft.color
    ctx.font         = `bold ${fontSize}px system-ui`
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
  state: HSState,
): void {
  ctx.clearRect(0, 0, w, h)
  const { cellSize, gridX, gridY } = computeGridLayout(w, h)

  drawBackground(ctx, w, h)
  drawPlayfield(ctx, state, gridX, gridY, cellSize)
  drawFoods(ctx, state, gridX, gridY, cellSize)
  drawSnake(ctx, state, gridX, gridY, cellSize)
  drawParticles(ctx, state)
  drawFloatingTexts(ctx, state, cellSize)
  drawHUD(ctx, w, h, state, gridX, gridY, cellSize)
  drawLevelBanner(ctx, w, h, state, cellSize)
}
