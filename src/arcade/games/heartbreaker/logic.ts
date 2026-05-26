import {
  COLS, INITIAL_ROWS, MIN_MATCH, SHOTS_PER_NEW_ROW,
  SPEED, POP_DURATION, DROP_GRAVITY,
  HEART_COLORS, INITIAL_PALETTE, COLORS,
  type HeartColor,
} from './constants'
import type { HBState, GridHeart, Projectile, SavedHBState } from './types'

// ─── Grid geometry ────────────────────────────────────────────────────────────

export function colsInRow(row: number) {
  return row % 2 === 0 ? COLS : COLS - 1
}

export function gridLeftPad(canvasWidth: number, R: number): number {
  return Math.max(0, (canvasWidth - COLS * 2 * R) / 2)
}

export function heartX(row: number, col: number, R: number, leftPad = 0): number {
  return leftPad + R + col * 2 * R + (row % 2 === 1 ? R : 0)
}

export function activePalette(shotCount: number): HeartColor[] {
  if (shotCount < 20) return ['red', 'purple', 'teal']
  if (shotCount < 40) return ['red', 'coral', 'purple', 'teal']
  if (shotCount < 60) return ['red', 'pink', 'coral', 'purple', 'teal']
  return [...HEART_COLORS] as HeartColor[]
}

export function heartY(row: number, R: number, topPad: number): number {
  return topPad + R + row * R * Math.sqrt(3)
}

// Six hex neighbors (offset-coordinate staggered grid)
export function neighbors(row: number, col: number): [number, number][] {
  return row % 2 === 0
    ? [
        [row - 1, col - 1], [row - 1, col],
        [row,     col - 1], [row,     col + 1],
        [row + 1, col - 1], [row + 1, col],
      ]
    : [
        [row - 1, col],     [row - 1, col + 1],
        [row,     col - 1], [row,     col + 1],
        [row + 1, col],     [row + 1, col + 1],
      ]
}

function validPos(row: number, col: number): boolean {
  return row >= 0 && col >= 0 && col < colsInRow(row) && row < 30
}

// Canvas-aware validity — allows placement beyond the initial COLS limit,
// up to the canvas walls (used for placement, not grid building)
function dynValidPos(row: number, col: number, canvasWidth: number, R: number): boolean {
  if (row < 0 || col < 0 || row >= 30) return false
  const lp = gridLeftPad(canvasWidth, R)
  return heartX(row, col, R, lp) <= canvasWidth - R
}

export function findHeart(hearts: GridHeart[], row: number, col: number): GridHeart | undefined {
  return hearts.find(h => h.row === row && h.col === col && !h.popping && !h.dropping)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeHeart(row: number, col: number, color: HeartColor): GridHeart {
  return { row, col, color, popping: false, popProgress: 0, dropping: false, dropY: 0, dropVY: 0, slideY: 0 }
}

function buildRow(row: number, palette: HeartColor[]): GridHeart[] {
  return Array.from({ length: colsInRow(row) }, (_, col) =>
    makeHeart(row, col, randomFrom(palette))
  )
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initGame(saved?: SavedHBState | null): HBState {
  if (saved) {
    return {
      hearts: saved.hearts.map(h => makeHeart(h.row, h.col, h.color)),
      currentColor: saved.currentColor,
      nextColor: saved.nextColor,
      score: saved.score,
      combo: 0,
      shotCount: saved.shotCount,
      shotsThisLevel: saved.shotsThisLevel,
      projectile: null,
      particles: [],
      gameOver: false,
      won: false,
      hudDirty: true,
      pendingFloatCheck: false,
    }
  }

  const hearts: GridHeart[] = []
  for (let r = 0; r < INITIAL_ROWS; r++) hearts.push(...buildRow(r, INITIAL_PALETTE))

  return {
    hearts,
    currentColor: randomFrom(activePalette(0)),
    nextColor: randomFrom(activePalette(0)),
    projectile: null as HBState['projectile'],
    score: 0,
    combo: 0,
    shotCount: 0,
    shotsThisLevel: 0,
    particles: [],
    gameOver: false,
    won: false,
    hudDirty: true,
    pendingFloatCheck: false,
  }
}

export function serializeState(s: HBState): SavedHBState {
  return {
    hearts: s.hearts
      .filter(h => !h.popping && !h.dropping)
      .map(h => ({ row: h.row, col: h.col, color: h.color })),
    currentColor: s.currentColor,
    nextColor: s.nextColor,
    score: s.score,
    shotCount: s.shotCount,
    shotsThisLevel: s.shotsThisLevel,
  }
}

// ─── Shooting ─────────────────────────────────────────────────────────────────

export function shoot(
  state: HBState,
  targetX: number, targetY: number,
  shooterX: number, shooterY: number,
): void {
  if (state.projectile || state.gameOver) return
  if (targetY >= shooterY - 10) return

  const dx = targetX - shooterX
  const dy = targetY - shooterY
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return

  state.projectile = { x: shooterX, y: shooterY, vx: (dx / len) * SPEED, vy: (dy / len) * SPEED, color: state.currentColor }
  state.currentColor = state.nextColor
  state.shotCount++
  state.shotsThisLevel++
  state.nextColor = randomFrom(activePalette(state.shotCount))
  state.hudDirty = true
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function updateGame(
  state: HBState,
  dt: number,
  canvasWidth: number,
  canvasHeight: number,
  R: number,
  topPad: number,
): void {
  tickParticles(state, dt)
  tickSlide(state, dt)
  const poppedSome = tickPopping(state, dt)
  if (poppedSome || state.pendingFloatCheck) {
    state.pendingFloatCheck = false
    dropFloating(state, R, topPad, canvasWidth)
  }
  tickDropping(state, dt)
  if (state.projectile) tickProjectile(state, dt, canvasWidth, canvasHeight, R, topPad)
}

function tickProjectile(
  state: HBState,
  dt: number,
  canvasWidth: number,
  canvasHeight: number,
  R: number,
  topPad: number,
): void {
  const p = state.projectile!
  p.x += p.vx * dt
  p.y += p.vy * dt

  // Wall bounce
  if (p.x - R < 0) { p.x = R; p.vx = Math.abs(p.vx) }
  if (p.x + R > canvasWidth) { p.x = canvasWidth - R; p.vx = -Math.abs(p.vx) }

  // Hit ceiling
  if (p.y - R < topPad) {
    placeProjectile(state, p, R, topPad, canvasHeight, canvasWidth)
    return
  }

  // Collide with surface hearts — hearts that have at least one open side
  // (invalid/out-of-bounds neighbors count as open: wall-adjacent hearts are surface)
  const lp = gridLeftPad(canvasWidth, R)
  const active = state.hearts.filter(h => !h.popping && !h.dropping)
  const thresh2 = (R * 1.8) ** 2
  let closestD2 = Infinity, hitHeart = false
  for (const h of active) {
    const isSurface = neighbors(h.row, h.col).some(([nr, nc]) =>
      !validPos(nr, nc) || !findHeart(active, nr, nc)
    )
    if (!isSurface) continue
    const hx = heartX(h.row, h.col, R, lp)
    const hy = heartY(h.row, R, topPad)
    const d2 = (p.x - hx) ** 2 + (p.y - hy) ** 2
    if (d2 < thresh2 && d2 < closestD2) { closestD2 = d2; hitHeart = true }
  }
  if (hitHeart) {
    placeProjectile(state, p, R, topPad, canvasHeight, canvasWidth)
  }
}

function placeProjectile(
  state: HBState,
  p: Projectile,
  R: number,
  topPad: number,
  canvasHeight: number,
  canvasWidth: number,
): void {
  state.projectile = null
  const pos = bestGridPos(state, p.x, p.y, p.vx, p.vy, R, topPad, canvasWidth)
  if (!pos) return

  const [row, col] = pos
  state.hearts.push(makeHeart(row, col, p.color))

  const matched = floodMatch(state.hearts, row, col)
  if (matched.length >= MIN_MATCH) {
    state.combo++
    state.score += matched.length * 10 * Math.max(1, state.combo)
    matched.forEach(h => {
      h.popping = true
      h.popProgress = 0
    })
    spawnBurst(state, matched, R, topPad, canvasWidth)
    state.pendingFloatCheck = true
  } else {
    state.combo = 0
  }

  // Game-over check: any heart too close to shooter
  const shooterY = canvasHeight - R * 3
  const dangerY = shooterY - R * 1.5
  const hasOverflow = state.hearts.some(
    h => !h.popping && !h.dropping && heartY(h.row, R, topPad) > dangerY
  )
  if (hasOverflow) {
    state.gameOver = true
    state.hudDirty = true
    return
  }

  // New row pressure — slide all hearts down one row height
  if (state.shotsThisLevel >= SHOTS_PER_NEW_ROW) {
    state.shotsThisLevel = 0
    const rowH = R * Math.sqrt(3)
    state.hearts.forEach(h => { h.row++; h.slideY = -rowH })
    state.hearts = state.hearts.filter(h => h.col < colsInRow(h.row))
    const newHearts = Array.from({ length: colsInRow(0) }, (_, col) =>
      makeHeart(0, col, randomFrom(activePalette(state.shotCount)))
    )
    newHearts.forEach(h => { h.slideY = -rowH })
    state.hearts.push(...newHearts)
  }

  // Win condition
  if (state.hearts.filter(h => !h.popping && !h.dropping).length === 0) {
    state.score += 500
    state.won = true
    state.gameOver = true
  }

  state.hudDirty = true
}

function bestGridPos(
  state: HBState,
  px: number, py: number,
  pvx: number, pvy: number,
  R: number, topPad: number,
  canvasWidth: number,
): [number, number] | null {
  const lp = gridLeftPad(canvasWidth, R)
  const active = state.hearts.filter(h => !h.popping && !h.dropping)

  const vLen = Math.sqrt(pvx * pvx + pvy * pvy) || 1
  // Reference point 2R "behind" the ball along its travel direction.
  // For a direct upward shot this lands ABOVE the hit heart, so the side
  // neighbor wins over the below-neighbor (fixing the "one row too low" issue).
  const refX = px - (pvx / vLen) * R * 2
  const refY = py - (pvy / vLen) * R * 2

  // Find closest SURFACE heart — same filter as collision detection.
  // Interior hearts can be physically closer (e.g. 0.2R away when ball barely
  // crosses the row boundary), so we must not use plain closest-active.
  let hitHeart: GridHeart | null = null
  let hitD2 = Infinity
  for (const h of active) {
    const isSurface = neighbors(h.row, h.col).some(([nr, nc]) =>
      !validPos(nr, nc) || !findHeart(active, nr, nc)
    )
    if (!isSurface) continue
    const hx = heartX(h.row, h.col, R, lp)
    const hy = heartY(h.row, R, topPad)
    const d2 = (px - hx) ** 2 + (py - hy) ** 2
    if (d2 < hitD2) { hitD2 = d2; hitHeart = h }
  }

  if (hitHeart && hitD2 < (R * 3) ** 2) {
    // Pick the empty neighbor of the hit heart closest to the reference point.
    // Distance-based (not dot-product): side neighbors beat below-neighbors for
    // direct upward shots because the reference is above the hit heart center.
    let bestDist = Infinity
    let bestRow = -1, bestCol = -1

    for (const [nr, nc] of neighbors(hitHeart.row, hitHeart.col)) {
      if (!dynValidPos(nr, nc, canvasWidth, R) || findHeart(active, nr, nc)) continue
      const nx = heartX(nr, nc, R, lp)
      const ny = heartY(nr, R, topPad)
      const d = (refX - nx) ** 2 + (refY - ny) ** 2
      if (d < bestDist) { bestDist = d; bestRow = nr; bestCol = nc }
    }

    if (bestRow !== -1) return [bestRow, bestCol]
  }

  // Fallback (ceiling hit or wide gap): collect all empty adjacent slots from
  // nearby cluster hearts and pick nearest to reference. Guarantees attached result.
  const candidates = new Map<string, [number, number]>()
  for (const h of active) {
    const hx = heartX(h.row, h.col, R, lp)
    const hy = heartY(h.row, R, topPad)
    if ((px - hx) ** 2 + (py - hy) ** 2 > (R * 5) ** 2) continue
    for (const [nr, nc] of neighbors(h.row, h.col)) {
      if (dynValidPos(nr, nc, canvasWidth, R) && !findHeart(active, nr, nc))
        candidates.set(`${nr},${nc}`, [nr, nc])
    }
  }
  if (py < topPad + R * 3 || active.length === 0) {
    for (let c = 0; c < COLS; c++) {
      if (!findHeart(active, 0, c)) candidates.set(`0,${c}`, [0, c])
    }
  }
  let bestR = -1, bestC = -1, bestD = Infinity
  for (const [nr, nc] of candidates.values()) {
    const cx = heartX(nr, nc, R, lp)
    const cy = heartY(nr, R, topPad)
    const d = (refX - cx) ** 2 + (refY - cy) ** 2
    if (d < bestD) { bestD = d; bestR = nr; bestC = nc }
  }
  if (bestR !== -1) return [bestR, bestC]

  // Last resort: math-snap reference point
  const row = Math.max(0, Math.round((refY - topPad - R) / (R * Math.sqrt(3))))
  const oddShift = row % 2 === 1 ? R : 0
  const maxCol = Math.max(0, Math.floor((canvasWidth - R - lp - R - oddShift) / (2 * R)))
  const col = Math.max(0, Math.min(maxCol, Math.round((refX - lp - R - oddShift) / (2 * R))))
  return [row, col]
}

// ─── Match & float ────────────────────────────────────────────────────────────

function floodMatch(hearts: GridHeart[], row: number, col: number): GridHeart[] {
  const start = findHeart(hearts, row, col)
  if (!start) return []
  const color = start.color
  const visited = new Set<string>()
  const queue: [number, number][] = [[row, col]]
  const result: GridHeart[] = []

  while (queue.length) {
    const [r, c] = queue.shift()!
    const key = `${r},${c}`
    if (visited.has(key)) continue
    visited.add(key)
    const h = findHeart(hearts, r, c)
    if (!h || h.color !== color) continue
    result.push(h)
    for (const [nr, nc] of neighbors(r, c)) queue.push([nr, nc])
  }
  return result
}

function dropFloating(state: HBState, R: number, topPad: number, canvasWidth: number): void {
  const active = state.hearts.filter(h => !h.popping && !h.dropping)
  const visited = new Set<string>()
  const queue: [number, number][] = active.filter(h => h.row === 0).map(h => [h.row, h.col])

  for (const [r, c] of queue) visited.add(`${r},${c}`)
  let qi = 0
  while (qi < queue.length) {
    const [r, c] = queue[qi++]
    for (const [nr, nc] of neighbors(r, c)) {
      const key = `${nr},${nc}`
      if (!visited.has(key) && findHeart(active, nr, nc)) {
        visited.add(key)
        queue.push([nr, nc])
      }
    }
  }

  const floating = active.filter(h => !visited.has(`${h.row},${h.col}`))
  if (!floating.length) return

  state.score += floating.length * 5
  floating.forEach(h => {
    h.dropping = true
    h.dropVY = 80
    spawnBurst(state, [h], R, topPad, canvasWidth)
  })
  state.hudDirty = true
}

// ─── Particle burst ───────────────────────────────────────────────────────────

function spawnBurst(state: HBState, hearts: GridHeart[], R: number, topPad: number, canvasWidth: number): void {
  const lp = gridLeftPad(canvasWidth, R)
  for (const h of hearts) {
    const cx = heartX(h.row, h.col, R, lp)
    const cy = heartY(h.row, R, topPad) + h.dropY + h.slideY
    const color = COLORS[h.color].light
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.3
      const spd = 80 + Math.random() * 140
      state.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 60,
        color,
        alpha: 1,
        r: 3 + Math.random() * 3.5,
      })
    }
  }
}

// ─── Tick helpers ─────────────────────────────────────────────────────────────

function tickSlide(state: HBState, dt: number): void {
  for (const h of state.hearts) {
    if (h.slideY === 0) continue
    h.slideY *= Math.exp(-12 * dt)
    if (Math.abs(h.slideY) < 0.5) h.slideY = 0
  }
}

function tickParticles(state: HBState, dt: number): void {
  for (const p of state.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt
    p.vy += 400 * dt
    p.alpha -= dt * 2
    p.r -= dt * 4
  }
  state.particles = state.particles.filter(p => p.alpha > 0 && p.r > 0.5)
}

function tickPopping(state: HBState, dt: number): boolean {
  let finished = false
  for (const h of state.hearts) {
    if (!h.popping) continue
    h.popProgress += dt / POP_DURATION
    if (h.popProgress >= 1) finished = true
  }
  if (finished) {
    state.hearts = state.hearts.filter(h => !h.popping || h.popProgress < 1)
  }
  return finished
}

function tickDropping(state: HBState, dt: number): void {
  for (const h of state.hearts) {
    if (!h.dropping) continue
    h.dropY += h.dropVY * dt
    h.dropVY += DROP_GRAVITY * dt
  }
  state.hearts = state.hearts.filter(h => !h.dropping || h.dropY < 1800)
}

// ─── Trajectory preview ───────────────────────────────────────────────────────

export function calcTrajectory(
  sx: number, sy: number,
  tx: number, ty: number,
  canvasWidth: number,
  topPad: number,
  R: number,
): { x: number; y: number }[] {
  if (ty >= sy - 10) return []
  const dx = tx - sx, dy = ty - sy
  const len = Math.sqrt(dx * dx + dy * dy)
  let vx = dx / len; const vy = dy / len
  let x = sx, y = sy
  const step = R * 0.5
  const pts: { x: number; y: number }[] = [{ x, y }]

  for (let i = 0; i < 300; i++) {
    x += vx * step; y += vy * step
    if (x - R < 0) { vx = Math.abs(vx); x = R }
    if (x + R > canvasWidth) { vx = -Math.abs(vx); x = canvasWidth - R }
    pts.push({ x, y })
    if (y < topPad + R) break
  }
  return pts
}
