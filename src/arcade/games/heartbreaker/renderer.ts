import { COLORS, type HeartColor } from './constants'
import { heartX, heartY, calcTrajectory, gridLeftPad } from './logic'
import type { HBState } from './types'

// ─── Heart path ───────────────────────────────────────────────────────────────

// Precomputed parametric heart points (unit radius = 16)
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

// ─── Draw a single heart ──────────────────────────────────────────────────────

export function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  R: number,
  color: HeartColor,
  alpha = 1,
  scale = 1,
): void {
  const s = (R / 16) * scale
  const { base, light } = COLORS[color]

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(cx, cy)
  ctx.scale(s, s)

  traceHeart(ctx)

  const grad = ctx.createLinearGradient(-10, -14, 10, 12)
  grad.addColorStop(0, light)
  grad.addColorStop(1, base)
  ctx.fillStyle = grad
  ctx.fill()

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath()
  ctx.ellipse(-5, -8, 3, 4, -0.45, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ─── Full scene ───────────────────────────────────────────────────────────────

export function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: HBState,
  R: number,
  topPad: number,
  aimX: number, aimY: number,
): void {
  ctx.clearRect(0, 0, w, h)
  drawBackground(ctx, w, h)
  drawDangerZone(ctx, w, h, R)
  drawGrid(ctx, state, R, topPad, w)
  drawParticles(ctx, state)
  drawTrajectoryLine(ctx, w, h, state, R, topPad, aimX, aimY)
  drawShooter(ctx, w, h, state, R)
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0f0508')
  grad.addColorStop(1, '#1a0a10')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

function drawDangerZone(ctx: CanvasRenderingContext2D, w: number, h: number, R: number): void {
  // Subtle red glow near shooter area
  const shooterY = h - R * 3
  const grad = ctx.createLinearGradient(0, shooterY - R * 2, 0, h)
  grad.addColorStop(0, 'rgba(190,30,46,0)')
  grad.addColorStop(1, 'rgba(190,30,46,0.08)')
  ctx.fillStyle = grad
  ctx.fillRect(0, shooterY - R * 2, w, h - shooterY + R * 2)

  // Dashed danger line
  ctx.save()
  ctx.strokeStyle = 'rgba(190,30,46,0.18)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 8])
  ctx.beginPath()
  ctx.moveTo(0, shooterY - R * 1.2)
  ctx.lineTo(w, shooterY - R * 1.2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

function drawGrid(ctx: CanvasRenderingContext2D, state: HBState, R: number, topPad: number, canvasWidth: number): void {
  const lp = gridLeftPad(canvasWidth, R)
  for (const h of state.hearts) {
    const cx = heartX(h.row, h.col, R, lp)
    const cy = heartY(h.row, R, topPad) + h.dropY + h.slideY

    if (h.popping) {
      // Scale out + fade
      const t = h.popProgress
      const scale = 1 + t * 0.5
      const alpha = 1 - t
      drawHeart(ctx, cx, cy, R, h.color, alpha, scale)
    } else if (h.dropping) {
      drawHeart(ctx, cx, cy, R, h.color, Math.max(0, 1 - h.dropY / 400))
    } else {
      drawHeart(ctx, cx, cy, R, h.color)
    }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, state: HBState): void {
  for (const p of state.particles) {
    ctx.save()
    ctx.globalAlpha = p.alpha
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

function drawTrajectoryLine(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: HBState,
  R: number, topPad: number,
  aimX: number, aimY: number,
): void {
  if (state.projectile || state.gameOver) return

  const sx = w / 2
  const sy = h - R * 3

  const pts = calcTrajectory(sx, sy, aimX, aimY, w, topPad, R)
  if (pts.length < 2) return

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 10])
  ctx.lineDashOffset = 0
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) ctx.moveTo(pts[i].x, pts[i].y)
    else ctx.lineTo(pts[i].x, pts[i].y)
  }
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

function drawShooter(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  state: HBState,
  R: number,
): void {
  const sx = w / 2
  const sy = h - R * 3

  // Flying projectile
  if (state.projectile) {
    const p = state.projectile
    drawHeart(ctx, p.x, p.y, R, p.color)
  }

  // Launcher base ring
  ctx.save()
  ctx.strokeStyle = 'rgba(190,30,46,0.4)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(sx, sy, R * 1.35, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Current heart in launcher
  if (!state.projectile) {
    drawHeart(ctx, sx, sy, R, state.currentColor)
  }

  // Next heart preview (bottom-right)
  const nx = w - R * 2.2
  const ny = h - R * 1.5
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.arc(nx, ny, R * 0.85, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  drawHeart(ctx, nx, ny, R * 0.65, state.nextColor, 0.85)

  // "NEXT" label
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = `bold ${Math.round(R * 0.38)}px system-ui`
  ctx.textAlign = 'center'
  ctx.fillText('NEXT', nx, ny + R * 1.3)
  ctx.restore()

  // Score
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `bold ${Math.round(R * 0.55)}px system-ui`
  ctx.textAlign = 'left'
  ctx.fillText(state.score.toLocaleString(), R * 0.6, h - R * 0.5)
  ctx.restore()
}
