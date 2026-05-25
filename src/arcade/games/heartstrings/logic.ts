import {
  GRID_COLS, GRID_ROWS,
  BASE_MOVE_INTERVAL, MIN_MOVE_INTERVAL,
  TOKENS_PER_LEVEL, WRAP_LEVEL,
  RAINBOW_DURATION, COMBO_WINDOW, COMBO_FOR_RAINBOW,
  ARROW_LIFETIME, PASSION_LEVEL, HEARTBREAK_LEVEL, ARROW_LEVEL,
  SCORE_MILESTONES, COLORS, HEART_COLORS,
} from './constants'
import type { HSState, SavedHSState, Segment, Food, FoodType, Direction } from './types'

const DIR_DR: Record<Direction, number> = { up: -1, down: 1, left:  0, right: 0 }
const DIR_DC: Record<Direction, number> = { up:  0, down: 0, left: -1, right: 1 }
const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
}

function computeMoveInterval(level: number): number {
  return Math.max(MIN_MOVE_INTERVAL, BASE_MOVE_INTERVAL - (level - 1) * 0.02)
}

function rnd(n: number): number { return Math.floor(Math.random() * n) }

export function computeGridLayout(
  canvasW: number,
  canvasH: number,
): { cellSize: number; gridX: number; gridY: number } {
  const availW = canvasW
  const availH = canvasH - 52        // reserve space for HUD
  const cellByW = Math.floor(availW / GRID_COLS)
  const cellByH = Math.floor(availH / GRID_ROWS)
  const cellSize = Math.min(cellByW, cellByH, 32)
  const gridX = Math.floor((canvasW - GRID_COLS * cellSize) / 2)
  const gridY = Math.floor(((canvasH - 52) - GRID_ROWS * cellSize) / 2)
  return { cellSize, gridX, gridY }
}

function segCanvas(
  row: number, col: number,
  gridX: number, gridY: number, cellSize: number,
): { x: number; y: number } {
  return { x: gridX + col * cellSize + cellSize / 2, y: gridY + row * cellSize + cellSize / 2 }
}

// ── Food placement ────────────────────────────────────────────────────────────

function emptyCell(state: HSState): Segment | null {
  const occ = new Set<string>()
  for (const s of state.segments) occ.add(`${s.row},${s.col}`)
  for (const f of state.foods)    occ.add(`${f.row},${f.col}`)
  const cands: Segment[] = []
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++)
      if (!occ.has(`${r},${c}`)) cands.push({ row: r, col: c })
  if (cands.length === 0) return null
  return cands[rnd(cands.length)]
}

function addFood(state: HSState, type: FoodType): void {
  const cell = emptyCell(state)
  if (cell) state.foods.push({ ...cell, type, age: 0, animPhase: Math.random() * Math.PI * 2 })
}

function spawnFood(state: HSState): void {
  if (state.foods.filter(f => f.type === 'love').length < 1)
    addFood(state, 'love')

  if (state.level >= PASSION_LEVEL &&
      state.foods.filter(f => f.type === 'passion').length < 1 &&
      Math.random() < 0.35)
    addFood(state, 'passion')

  if (state.level >= HEARTBREAK_LEVEL &&
      state.foods.filter(f => f.type === 'heartbreak').length < 1 &&
      Math.random() < 0.25)
    addFood(state, 'heartbreak')

  if (state.level >= ARROW_LEVEL &&
      state.foods.filter(f => f.type === 'arrow').length < 1 &&
      Math.random() < 0.3)
    addFood(state, 'arrow')
}

// ── Particles & floating text ─────────────────────────────────────────────────

function burst(
  state: HSState,
  cx: number, cy: number,
  color: string,
  count = 12,
): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4
    const spd = 70 + Math.random() * 130
    state.particles.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, color, alpha: 1, r: 2 + Math.random() * 3 })
  }
}

function floatText(state: HSState, x: number, y: number, text: string, color: string): void {
  state.floatingTexts.push({ x, y, text, color, vy: -55, alpha: 1 })
}

// ── Food application ──────────────────────────────────────────────────────────

// Returns true if tickMove should NOT pop the tail (snake grew or handled length itself).
function applyFood(
  state: HSState,
  food: Food,
  gridX: number, gridY: number, cellSize: number,
): boolean {
  const { x, y } = segCanvas(food.row, food.col, gridX, gridY, cellSize)
  const prev = state.prevScore
  let grow = true

  switch (food.type) {
    case 'love': {
      const mult = Math.min(state.combo, 8)
      const pts = 10 * mult
      state.score += pts
      state.combo++
      state.comboTimer = COMBO_WINDOW
      state.tokensThisLevel++
      state.tokensEaten++
      state.pulseTimer = 0.22
      burst(state, x, y, COLORS.pink.light)
      floatText(state, x, y, mult > 1 ? `+${pts} ×${mult}` : `+${pts}`, '#F472B6')
      break
    }
    case 'passion': {
      const mult = Math.min(state.combo, 8)
      const pts = 30 * mult
      state.score += pts
      state.combo++
      state.comboTimer = COMBO_WINDOW
      state.tokensThisLevel++
      state.tokensEaten++
      state.pulseTimer = 0.22
      burst(state, x, y, COLORS.coral.light, 20)
      floatText(state, x, y, `+${pts} HOT!`, '#FF7043')
      break
    }
    case 'heartbreak': {
      state.score += 100
      state.tokensThisLevel++
      state.tokensEaten++
      state.pulseTimer = 0.15
      // Shrink snake by 3 segments (floor at 3)
      const target = Math.max(3, state.segments.length - 4)
      for (let i = state.segments.length - 1; i >= target; i--) {
        const seg = state.segments[i]
        const { x: px, y: py } = segCanvas(seg.row, seg.col, gridX, gridY, cellSize)
        burst(state, px, py, COLORS.purple.light, 6)
      }
      while (state.segments.length > target) state.segments.pop()
      burst(state, x, y, COLORS.purple.base, 8)
      floatText(state, x, y, '+100 💔', '#A78BFA')
      grow = true  // length already managed above
      break
    }
    case 'arrow': {
      const mult = Math.min(state.combo, 8)
      const pts = 150 * mult
      state.score += pts
      state.combo++
      state.comboTimer = COMBO_WINDOW
      state.tokensThisLevel++
      state.tokensEaten++
      burst(state, x, y, COLORS.gold.light, 22)
      floatText(state, x, y, `+${pts} ✨`, '#FCD34D')
      grow = false  // arrow: no length gain
      break
    }
  }

  // Rainbow trigger
  if (state.combo >= COMBO_FOR_RAINBOW && state.rainbowTimer <= 0) {
    state.rainbowTimer = RAINBOW_DURATION
    floatText(state, x, y - 28, '🌈 RAINBOW HEART!', '#FF69B4')
    burst(state, x, y, '#FF69B4', 30)
  }

  // Score milestones
  for (const m of SCORE_MILESTONES) {
    if (prev < m && state.score >= m) {
      burst(state, x, y, COLORS.gold.light, 35)
      floatText(state, x, y - 44, `${m.toLocaleString()}!`, '#FCD34D')
    }
  }
  state.prevScore = state.score

  return grow
}

// ── Move tick ─────────────────────────────────────────────────────────────────

function tickMove(
  state: HSState,
  gridX: number, gridY: number, cellSize: number,
): void {
  // Snapshot positions before this step (for interpolation)
  state.prevSegments = state.segments.map(s => ({ ...s }))

  state.direction = state.nextDir

  const head = state.segments[0]
  let newRow = head.row + DIR_DR[state.direction]
  let newCol = head.col + DIR_DC[state.direction]

  // Wall check
  if (state.level >= WRAP_LEVEL) {
    newRow = ((newRow % GRID_ROWS) + GRID_ROWS) % GRID_ROWS
    newCol = ((newCol % GRID_COLS) + GRID_COLS) % GRID_COLS
  } else {
    if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) {
      triggerGameOver(state, gridX, gridY, cellSize)
      return
    }
  }

  // Self-collision (skip during rainbow)
  if (state.rainbowTimer <= 0) {
    for (let i = 0; i < state.segments.length - 1; i++) {
      if (state.segments[i].row === newRow && state.segments[i].col === newCol) {
        triggerGameOver(state, gridX, gridY, cellSize)
        return
      }
    }
  }

  state.segments.unshift({ row: newRow, col: newCol })

  const fi = state.foods.findIndex(f => f.row === newRow && f.col === newCol)
  if (fi >= 0) {
    const food = state.foods.splice(fi, 1)[0]
    const grow = applyFood(state, food, gridX, gridY, cellSize)
    if (!grow) state.segments.pop()
    spawnFood(state)
    maybeAdvanceLevel(state)
  } else {
    state.segments.pop()
  }
}

function triggerGameOver(
  state: HSState,
  gridX: number, gridY: number, cellSize: number,
): void {
  state.gameOver = true
  state.hudDirty = true
  for (const seg of state.segments) {
    const { x, y } = segCanvas(seg.row, seg.col, gridX, gridY, cellSize)
    burst(state, x, y, COLORS.red.light, 7)
  }
}

function maybeAdvanceLevel(state: HSState): void {
  if (state.tokensThisLevel < TOKENS_PER_LEVEL) return
  state.level++
  state.tokensThisLevel = 0
  state.moveInterval = computeMoveInterval(state.level)
  state.levelBannerText = state.level === WRAP_LEVEL ? 'WRAP MODE UNLOCKED!' : `LEVEL ${state.level}`
  state.levelBanner = 2.5
  state.hudDirty = true
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initGame(saved: SavedHSState | null): HSState {
  let segments: Segment[]
  let direction: Direction
  let score = 0
  let level = 1
  let tokensEaten = 0

  if (saved && saved.segments?.length >= 3) {
    segments    = saved.segments
    direction   = saved.direction
    score       = saved.score
    level       = saved.level
    tokensEaten = saved.tokensEaten
  } else {
    const midR = Math.floor(GRID_ROWS / 2)
    const midC = Math.floor(GRID_COLS / 2)
    segments  = [{ row: midR, col: midC }, { row: midR, col: midC - 1 }, { row: midR, col: midC - 2 }]
    direction = 'right'
  }

  const state: HSState = {
    segments,
    prevSegments: segments.map(s => ({ ...s })),
    direction,
    nextDir: direction,
    moveInterval: computeMoveInterval(level),
    moveTimer: 0,
    moveProgress: 0,
    foods: [],
    score,
    prevScore: score,
    level,
    tokensEaten,
    tokensThisLevel: 0,
    combo: 1,
    comboTimer: 0,
    rainbowTimer: 0,
    pulseTimer: 0,
    particles: [],
    floatingTexts: [],
    gameOver: false,
    hudDirty: false,
    levelBanner: 0,
    levelBannerText: '',
    time: 0,
  }

  spawnFood(state)
  spawnFood(state)  // start with 2 foods visible
  return state
}

export function enqueueDir(state: HSState, dir: Direction): void {
  if (dir !== OPPOSITE[state.direction]) state.nextDir = dir
}

export function updateGame(
  state: HSState,
  dt: number,
  canvasW: number,
  canvasH: number,
): void {
  if (state.gameOver) {
    // Keep animating particles/texts after game over
    tickEffects(state, dt)
    return
  }

  const { cellSize, gridX, gridY } = computeGridLayout(canvasW, canvasH)
  state.time += dt

  // Countdown timers
  if (state.comboTimer > 0) {
    state.comboTimer -= dt
    if (state.comboTimer <= 0) { state.comboTimer = 0; state.combo = 1 }
  }
  if (state.rainbowTimer > 0) {
    state.rainbowTimer = Math.max(0, state.rainbowTimer - dt)
  }
  if (state.pulseTimer  > 0) state.pulseTimer  = Math.max(0, state.pulseTimer  - dt)
  if (state.levelBanner > 0) state.levelBanner = Math.max(0, state.levelBanner - dt)

  // Animate + expire foods
  for (const f of state.foods) { f.age += dt; f.animPhase += dt * 2.8 }
  state.foods = state.foods.filter(f => !(f.type === 'arrow' && f.age > ARROW_LIFETIME))
  if (state.foods.every(f => f.type !== 'love')) spawnFood(state)

  tickEffects(state, dt)

  // Move tick
  state.moveTimer += dt
  if (state.moveTimer >= state.moveInterval) {
    state.moveTimer -= state.moveInterval
    tickMove(state, gridX, gridY, cellSize)
  }
  state.moveProgress = Math.min(1, state.moveTimer / state.moveInterval)
}

function tickEffects(state: HSState, dt: number): void {
  state.particles = state.particles.filter(p => {
    p.x  += p.vx * dt
    p.y  += p.vy * dt
    p.vy += 300 * dt
    p.alpha -= dt * 2.2
    return p.alpha > 0
  })
  state.floatingTexts = state.floatingTexts.filter(ft => {
    ft.y  += ft.vy * dt
    ft.alpha -= dt * 1.4
    return ft.alpha > 0
  })
}

export function serializeState(state: HSState): SavedHSState {
  return {
    segments:    state.segments.map(s => ({ ...s })),
    direction:   state.direction,
    score:       state.score,
    level:       state.level,
    tokensEaten: state.tokensEaten,
  }
}
