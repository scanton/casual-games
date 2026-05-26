import {
  GRID_COLS, GRID_ROWS,
  SWAP_DURATION, REVERT_DURATION, POP_DURATION, FALL_DURATION,
  BASE_CELL_SCORE, POWER_BONUS, WILD_BONUS, LOVE_SURGE_BONUS,
  SCORE_MILESTONES, HEART_COLORS, COLORS, HUD_TOP,
  type HeartColor,
} from './constants'

export const HINT_DELAY      = 25   // seconds of idle before hint shows
export const LEVEL_WIN_DELAY = 2.2  // seconds before auto-advancing level
import type { Cell, TileType, Phase, HMState, Particle, FloatingText, SavedHMState } from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function rnd(n: number): number { return Math.floor(Math.random() * n) }

export function getLevelConfig(level: number): {
  target: number; moves: number; colorCount: number; lockedCount: number; iceStrength: number
} {
  return {
    target:      Math.round(300 * Math.pow(1.35, level - 1)),
    moves:       Math.max(14, 26 - level),
    colorCount:  Math.min(6, 3 + Math.floor((level - 1) / 2)),
    lockedCount: level < 3 ? 0 : Math.min(8, (level - 2) * 2),
    iceStrength: level >= 5 ? 2 : 1,
  }
}

export function computeGridLayout(
  canvasW: number,
  canvasH: number,
): { cellSize: number; gridX: number; gridY: number } {
  const availH   = canvasH - HUD_TOP
  const cellByW  = Math.floor(canvasW / GRID_COLS)
  const cellByH  = Math.floor(availH / GRID_ROWS)
  const cellSize = Math.min(cellByW, cellByH)   // fill the space, no hard cap
  const gridW    = GRID_COLS * cellSize
  const gridX    = Math.floor((canvasW - gridW) / 2)
  const gridY    = HUD_TOP + 6                  // pin right below the HUD
  return { cellSize, gridX, gridY }
}

function makeCell(row: number, col: number, color: HeartColor): Cell {
  return {
    row, col, color,
    type: 'normal',
    animOffsetX: 0, animOffsetY: 0,
    popProgress: 0, popping: false,
    locked: false, iceCount: 0,
  }
}

// ── Board building ────────────────────────────────────────────────────────────

function buildBoard(colorCount: number, lockedCount: number, iceStrength: number): Cell[][] {
  const colors = HEART_COLORS.slice(0, colorCount) as HeartColor[]

  const board: Cell[][] = Array.from({ length: GRID_ROWS }, (_, r) =>
    Array.from({ length: GRID_COLS }, (_, c) => makeCell(r, c, colors[0]))
  )

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const forbidden = new Set<HeartColor>()
      if (r >= 2 && board[r-1][c].color === board[r-2][c].color) forbidden.add(board[r-1][c].color)
      if (c >= 2 && board[r][c-1].color === board[r][c-2].color) forbidden.add(board[r][c-1].color)
      const candidates = colors.filter(col => !forbidden.has(col))
      board[r][c] = makeCell(r, c, (candidates.length > 0 ? candidates : colors)[rnd(Math.max(1, (candidates.length > 0 ? candidates : colors).length))])
    }
  }

  // Place locked (ice) tiles, avoiding top 2 rows and edges
  const lockCandidates: [number, number][] = []
  for (let r = 2; r < GRID_ROWS; r++)
    for (let c = 1; c < GRID_COLS - 1; c++)
      lockCandidates.push([r, c])

  for (let i = 0; i < Math.min(lockedCount, lockCandidates.length); i++) {
    const j = i + rnd(lockCandidates.length - i)
    ;[lockCandidates[i], lockCandidates[j]] = [lockCandidates[j], lockCandidates[i]]
    const [lr, lc] = lockCandidates[i]
    board[lr][lc].locked  = true
    board[lr][lc].iceCount = iceStrength
  }

  return board
}

// ── Match finding ─────────────────────────────────────────────────────────────

interface MatchRun {
  cells: { row: number; col: number }[]
}

function findMatchRuns(board: Cell[][]): MatchRun[] {
  const runs: MatchRun[] = []

  // Horizontal
  for (let r = 0; r < GRID_ROWS; r++) {
    let start = 0
    for (let c = 1; c <= GRID_COLS; c++) {
      const ended = c === GRID_COLS
        || board[r][c].color !== board[r][c-1].color
        || board[r][c-1].popping
        || board[r][c].popping
      if (ended) {
        if (c - start >= 3)
          runs.push({ cells: Array.from({ length: c - start }, (_, i) => ({ row: r, col: start + i })) })
        start = c
      }
    }
  }

  // Vertical
  for (let c = 0; c < GRID_COLS; c++) {
    let start = 0
    for (let r = 1; r <= GRID_ROWS; r++) {
      const ended = r === GRID_ROWS
        || board[r][c].color !== board[r-1][c].color
        || board[r-1][c].popping
        || board[r][c].popping
      if (ended) {
        if (r - start >= 3)
          runs.push({ cells: Array.from({ length: r - start }, (_, i) => ({ row: start + i, col: c })) })
        start = r
      }
    }
  }

  return runs
}

// ── Effects helpers ───────────────────────────────────────────────────────────

function cellCenter(
  row: number, col: number,
  gridX: number, gridY: number, cellSize: number,
): { x: number; y: number } {
  return { x: gridX + col * cellSize + cellSize / 2, y: gridY + row * cellSize + cellSize / 2 }
}

function burst(state: HMState, cx: number, cy: number, color: string, count = 10): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4
    const spd = 60 + Math.random() * 120
    state.particles.push({ x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, color, alpha: 1, r: 2 + Math.random() * 3 })
  }
}

function floatText(state: HMState, x: number, y: number, text: string, color: string): void {
  state.floatingTexts.push({ x, y, text, color, vy: -52, alpha: 1 })
}

// ── Scoring & popping ─────────────────────────────────────────────────────────

export function markPopping(
  state: HMState,
  gridX: number, gridY: number, cellSize: number,
): boolean {
  const runs = findMatchRuns(state.board)
  if (runs.length === 0) return false

  const prev = state.prevScore
  const mult = 1 + state.cascadeCount * 0.5

  // Build pop set
  const popSet = new Set<string>()
  for (const run of runs) {
    for (const { row, col } of run.cells) popSet.add(`${row},${col}`)
  }

  // Spawn special tile from straight 4+/5+ run or L/T/+ shape on direct player swap
  if (state.cascadeCount === 0) {
    let spawnType: TileType | null = null
    let spawnCell: { row: number; col: number } | null = null

    // Check straight runs: 4+ → power, 5+ → wild
    let maxRun: MatchRun | null = null
    for (const run of runs) {
      if (!maxRun || run.cells.length > maxRun.cells.length) maxRun = run
    }
    if (maxRun && maxRun.cells.length >= 4) {
      spawnType = maxRun.cells.length >= 5 ? 'wild' : 'power'
      spawnCell = maxRun.cells[Math.floor(maxRun.cells.length / 2)]
    }

    // Check L/T/+ shapes: two runs sharing a cell with ≥5 combined unique cells → wild
    // Overrides straight-run result when found (L-shapes are harder to achieve)
    const cellRunMap = new Map<string, MatchRun[]>()
    for (const run of runs) {
      for (const { row, col } of run.cells) {
        const key = `${row},${col}`
        if (!cellRunMap.has(key)) cellRunMap.set(key, [])
        cellRunMap.get(key)!.push(run)
      }
    }
    for (const [key, sharedRuns] of cellRunMap) {
      if (sharedRuns.length < 2) continue
      const combined = new Set<string>()
      for (const run of sharedRuns)
        for (const { row, col } of run.cells) combined.add(`${row},${col}`)
      if (combined.size >= 5) {
        const [r, c] = key.split(',').map(Number)
        spawnType = 'wild'
        spawnCell = { row: r, col: c }
        break
      }
    }

    if (spawnType && spawnCell) {
      const { row: sr, col: sc } = spawnCell
      const cell = state.board[sr][sc]
      if (!cell.locked) {
        popSet.delete(`${sr},${sc}`)
        cell.type = spawnType
      }
    }
  }

  // Expand power / wild tiles in pop set (loop until stable)
  let changed = true
  while (changed) {
    changed = false
    for (const key of [...popSet]) {
      const [r, c] = key.split(',').map(Number)
      const cell = state.board[r][c]
      if (cell.type === 'power') {
        cell.type = 'normal'
        for (let cc = 0; cc < GRID_COLS; cc++) { const k = `${r},${cc}`; if (!popSet.has(k)) { popSet.add(k); changed = true } }
        for (let rr = 0; rr < GRID_ROWS; rr++) { const k = `${rr},${c}`; if (!popSet.has(k)) { popSet.add(k); changed = true } }
      } else if (cell.type === 'wild') {
        cell.type = 'normal'
        const color = cell.color
        for (let rr = 0; rr < GRID_ROWS; rr++)
          for (let cc = 0; cc < GRID_COLS; cc++)
            if (state.board[rr][cc].color === color) { const k = `${rr},${cc}`; if (!popSet.has(k)) { popSet.add(k); changed = true } }
      }
    }
  }

  // Score and mark
  let cellsPopped = 0
  let powerBonusCount = 0
  let wildBonusCount  = 0

  for (const key of popSet) {
    const [r, c] = key.split(',').map(Number)
    const cell = state.board[r][c]
    if (cell.popping) continue

    if (cell.locked && cell.iceCount > 0) {
      cell.iceCount--
      if (cell.iceCount <= 0) {
        cell.locked = false
        cell.popping = true
        cell.popProgress = 0
        cellsPopped++
      }
      const { x, y } = cellCenter(r, c, gridX, gridY, cellSize)
      burst(state, x, y, '#bfdbfe', 5)
      continue
    }

    if (cell.type === 'power') powerBonusCount++
    if (cell.type === 'wild')  wildBonusCount++

    cell.popping = true
    cell.popProgress = 0
    cellsPopped++

    const { x, y } = cellCenter(r, c, gridX, gridY, cellSize)
    burst(state, x, y, COLORS[cell.color].light, 8)
  }

  const baseScore    = Math.round(cellsPopped * BASE_CELL_SCORE * mult)
  const bonusScore   = powerBonusCount * POWER_BONUS + wildBonusCount * WILD_BONUS
  const total        = baseScore + bonusScore
  state.score       += total
  state.levelScore  += total
  state.hudDirty     = true

  const bx = gridX + GRID_COLS * cellSize / 2
  const by = gridY + GRID_ROWS * cellSize / 2

  if (total > 0) {
    const suffix = state.cascadeCount > 0 ? ` ×${state.cascadeCount + 1}` : ''
    floatText(state, bx, by - 20, `+${total}${suffix}`, '#FCD34D')
  }
  if (powerBonusCount > 0) floatText(state, bx, by - 50, '💥 HEARTPIERCER!', COLORS.gold.light)
  if (wildBonusCount  > 0) floatText(state, bx, by - 70, '🌈 WILD LOVE!',    COLORS.pink.light)

  // Love Surge (2nd+ cascade)
  if (state.cascadeCount >= 2) {
    state.score      += LOVE_SURGE_BONUS
    state.levelScore += LOVE_SURGE_BONUS
    burst(state, bx, by, '#FF69B4', 28)
    floatText(state, bx, by - 90, '❤ LOVE SURGE! +500', '#FF69B4')
  }

  // Heartquake milestones
  for (const m of SCORE_MILESTONES) {
    if (prev < m && state.score >= m) {
      state.shakeTimer = 0.55
      burst(state, bx, by, COLORS.gold.light, 35)
      floatText(state, bx, by - 110, `${m.toLocaleString()}! ✨`, '#FCD34D')
    }
  }
  state.prevScore = state.score

  return true
}

// ── Gravity ───────────────────────────────────────────────────────────────────

function applyGravity(state: HMState, cellSize: number): void {
  const colors = HEART_COLORS.slice(0, state.colorCount) as HeartColor[]

  for (let c = 0; c < GRID_COLS; c++) {
    // Collect surviving cells top→bottom
    const keep: Cell[] = []
    for (let r = 0; r < GRID_ROWS; r++) {
      if (!state.board[r][c].popping) keep.push(state.board[r][c])
    }

    const dropped = GRID_ROWS - keep.length

    // Shift existing tiles to the bottom
    for (let i = 0; i < keep.length; i++) {
      const newRow = dropped + i
      const cell   = keep[i]
      const oldRow = cell.row
      cell.row = newRow
      cell.col = c
      state.board[newRow][c] = cell
      if (oldRow !== newRow) {
        cell.animOffsetY = (oldRow - newRow) * cellSize
      }
    }

    // Spawn new tiles at top, stacked above the grid
    for (let i = 0; i < dropped; i++) {
      const newCell = makeCell(i, c, colors[rnd(colors.length)])
      newCell.animOffsetY = -(dropped - i) * cellSize
      state.board[i][c] = newCell
    }
  }

  // Clear pop flags
  for (const row of state.board)
    for (const cell of row) { cell.popping = false; cell.popProgress = 0 }
}

// ── Valid move detection ──────────────────────────────────────────────────────

export function findFirstValidSwap(
  board: Cell[][],
): [{ row: number; col: number }, { row: number; col: number }] | null {
  const dirs = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }]
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      for (const { dr, dc } of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr >= GRID_ROWS || nc >= GRID_COLS) continue
        const a = board[r][c], b = board[nr][nc]
        board[r][c] = b; board[nr][nc] = a
        a.row = nr; a.col = nc; b.row = r; b.col = c
        const ok = findMatchRuns(board).length > 0
        board[r][c] = a; board[nr][nc] = b
        a.row = r; a.col = c; b.row = nr; b.col = nc
        if (ok) return [{ row: r, col: c }, { row: nr, col: nc }]
      }
    }
  }
  return null
}

function hasValidSwap(board: Cell[][]): boolean {
  const dirs = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }]
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      for (const { dr, dc } of dirs) {
        const nr = r + dr, nc = c + dc
        if (nr >= GRID_ROWS || nc >= GRID_COLS) continue
        const a = board[r][c], b = board[nr][nc]
        board[r][c] = b; board[nr][nc] = a
        a.row = nr; a.col = nc; b.row = r; b.col = c
        const ok = findMatchRuns(board).length > 0
        board[r][c] = a; board[nr][nc] = b
        a.row = r; a.col = c; b.row = nr; b.col = nc
        if (ok) return true
      }
    }
  }
  return false
}

function shuffleBoard(state: HMState): void {
  const colors = HEART_COLORS.slice(0, state.colorCount) as HeartColor[]
  const free: Cell[] = []
  for (const row of state.board) for (const cell of row) if (!cell.locked) free.push(cell)

  const shuffled = free.map(c => c.color)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rnd(i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  for (let i = 0; i < free.length; i++) { free[i].color = shuffled[i]; free[i].type = 'normal' }

  let tries = 0
  while (!hasValidSwap(state.board) && tries < 12) {
    for (let i = 0; i < free.length; i++) free[i].color = colors[rnd(colors.length)]
    tries++
  }
}

// ── Swap ──────────────────────────────────────────────────────────────────────

function doSwap(
  state: HMState,
  fromRow: number, fromCol: number,
  toRow: number,   toCol: number,
  cellSize: number,
): void {
  const a = state.board[fromRow][fromCol]
  const b = state.board[toRow][toCol]
  state.board[fromRow][fromCol] = b
  state.board[toRow][toCol]     = a
  a.row = toRow;   a.col = toCol
  b.row = fromRow; b.col = fromCol

  const dr = toRow - fromRow
  const dc = toCol - fromCol
  a.animOffsetX = -dc * cellSize
  a.animOffsetY = -dr * cellSize
  b.animOffsetX =  dc * cellSize
  b.animOffsetY =  dr * cellSize
}

export function trySwap(
  state: HMState,
  fromRow: number, fromCol: number,
  toRow: number,   toCol: number,
  cellSize: number,
): void {
  if (state.phase !== 'idle' || state.gameOver || state.levelWon) return
  if (Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol) !== 1) return

  state.swapFrom    = { row: fromRow, col: fromCol }
  state.swapTo      = { row: toRow,   col: toCol }
  state.cascadeCount = 0
  state.hintTimer   = 0
  state.hintPair    = null
  doSwap(state, fromRow, fromCol, toRow, toCol, cellSize)
  state.phase      = 'swapping'
  state.phaseTimer = SWAP_DURATION
}

// ── Animation ─────────────────────────────────────────────────────────────────

function animateTiles(state: HMState, dt: number): void {
  for (const row of state.board) {
    for (const cell of row) {
      if (cell.animOffsetX !== 0) {
        cell.animOffsetX *= Math.exp(-24 * dt)
        if (Math.abs(cell.animOffsetX) < 0.5) cell.animOffsetX = 0
      }
      if (cell.animOffsetY !== 0) {
        cell.animOffsetY *= Math.exp(-11 * dt)
        if (Math.abs(cell.animOffsetY) < 0.5) cell.animOffsetY = 0
      }
      if (cell.popping) {
        cell.popProgress += dt / POP_DURATION
        if (cell.popProgress > 1) cell.popProgress = 1
      }
    }
  }
}

function tickEffects(state: HMState, dt: number): void {
  state.particles = state.particles.filter(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.alpha -= dt * 2.5
    return p.alpha > 0
  })
  state.floatingTexts = state.floatingTexts.filter(ft => {
    ft.y += ft.vy * dt; ft.alpha -= dt * 1.4
    return ft.alpha > 0
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initGame(saved: SavedHMState | null): HMState {
  const level  = saved?.level ?? 1
  const score  = saved?.score ?? 0
  const config = getLevelConfig(level)
  const board  = buildBoard(config.colorCount, config.lockedCount, config.iceStrength)

  let tries = 0
  while (!hasValidSwap(board) && tries < 20) {
    const colors = HEART_COLORS.slice(0, config.colorCount) as HeartColor[]
    for (const row of board) for (const cell of row) if (!cell.locked) cell.color = colors[rnd(colors.length)]
    tries++
  }

  return {
    board,
    phase: 'idle',
    phaseTimer: 0,
    swapFrom: null,
    swapTo:   null,
    selected: null,
    score,
    prevScore: score,
    levelScore: 0,
    moves:    config.moves,
    level,
    target:   config.target,
    cascadeCount: 0,
    particles: [],
    floatingTexts: [],
    levelBanner: 0,
    levelBannerText: '',
    shakeX: 0,
    shakeY: 0,
    shakeTimer: 0,
    hintTimer: 0,
    hintPair: null,
    gameOver: false,
    levelWon: false,
    levelWonTimer: LEVEL_WIN_DELAY,
    hudDirty: false,
    time: 0,
    colorCount: config.colorCount,
  }
}

export function advanceLevel(state: HMState): HMState {
  const level  = state.level + 1
  const config = getLevelConfig(level)
  const board  = buildBoard(config.colorCount, config.lockedCount, config.iceStrength)

  let tries = 0
  while (!hasValidSwap(board) && tries < 20) {
    const colors = HEART_COLORS.slice(0, config.colorCount) as HeartColor[]
    for (const row of board) for (const cell of row) if (!cell.locked) cell.color = colors[rnd(colors.length)]
    tries++
  }

  return {
    ...state,
    board,
    phase: 'idle',
    phaseTimer: 0,
    swapFrom: null,
    swapTo:   null,
    selected: null,
    levelScore: 0,
    moves:    config.moves,
    level,
    target:   config.target,
    cascadeCount: 0,
    particles: [],
    floatingTexts: [],
    levelBanner: 2.5,
    levelBannerText: `LEVEL ${level}`,
    shakeX: 0,
    shakeY: 0,
    shakeTimer: 0,
    hintTimer: 0,
    hintPair: null,
    gameOver: false,
    levelWon: false,
    levelWonTimer: LEVEL_WIN_DELAY,
    hudDirty: false,
    colorCount: config.colorCount,
  }
}

export function updateGame(state: HMState, dt: number, canvasW: number, canvasH: number): void {
  dt = Math.min(dt, 0.05)
  state.time += dt

  if (state.shakeTimer > 0) {
    state.shakeTimer = Math.max(0, state.shakeTimer - dt)
    state.shakeX = state.shakeTimer > 0 ? (Math.random() - 0.5) * 10 * state.shakeTimer : 0
    state.shakeY = state.shakeTimer > 0 ? (Math.random() - 0.5) * 10 * state.shakeTimer : 0
  }

  if (state.levelBanner > 0) state.levelBanner = Math.max(0, state.levelBanner - dt)

  animateTiles(state, dt)
  tickEffects(state, dt)

  // Auto-advance after level win
  if (state.levelWon) {
    state.levelWonTimer = Math.max(0, state.levelWonTimer - dt)
    if (state.levelWonTimer <= 0) {
      // Signal to the component that it's time to advance
      state.hudDirty = true
    }
    return
  }

  if (state.gameOver) return

  // Hint timer: increment while idle, show hint after HINT_DELAY seconds
  if (state.phase === 'idle') {
    state.hintTimer += dt
    if (state.hintTimer >= HINT_DELAY && !state.hintPair) {
      state.hintPair = findFirstValidSwap(state.board)
    }
  }

  if (state.phase === 'idle') return

  state.phaseTimer -= dt
  if (state.phaseTimer > 0) return

  const { cellSize, gridX, gridY } = computeGridLayout(canvasW, canvasH)

  switch (state.phase) {
    case 'swapping': {
      const hit = markPopping(state, gridX, gridY, cellSize)
      if (hit) {
        state.moves--
        state.phase      = 'popping'
        state.phaseTimer = POP_DURATION
      } else {
        if (state.swapFrom && state.swapTo)
          doSwap(state, state.swapTo.row, state.swapTo.col, state.swapFrom.row, state.swapFrom.col, cellSize)
        state.phase      = 'reverting'
        state.phaseTimer = REVERT_DURATION
      }
      break
    }
    case 'reverting': {
      state.phase    = 'idle'
      state.swapFrom = null
      state.swapTo   = null
      break
    }
    case 'popping': {
      applyGravity(state, cellSize)
      state.phase      = 'falling'
      state.phaseTimer = FALL_DURATION
      break
    }
    case 'falling': {
      state.cascadeCount++
      const cascade = markPopping(state, gridX, gridY, cellSize)
      if (cascade) {
        state.phase      = 'popping'
        state.phaseTimer = POP_DURATION
      } else {
        state.cascadeCount = 0
        state.phase        = 'idle'
        state.swapFrom     = null
        state.swapTo       = null

        const bx = gridX + GRID_COLS * cellSize / 2
        const by = gridY + GRID_ROWS * cellSize / 2

        if (state.levelScore >= state.target) {
          state.levelWon      = true
          state.levelWonTimer = LEVEL_WIN_DELAY
          state.levelBanner   = LEVEL_WIN_DELAY
          state.levelBannerText = '💝 LEVEL COMPLETE!'
          state.hudDirty      = true
          burst(state, bx, by, '#FCD34D', 45)
          floatText(state, bx, by, '💝 LOVE WINS!', '#FCD34D')
        } else if (state.moves <= 0) {
          state.gameOver = true
          state.hudDirty = true
        } else if (!hasValidSwap(state.board)) {
          shuffleBoard(state)
          state.levelBannerText = '💫 HEART SHUFFLE!'
          state.levelBanner     = 2.0
        }
      }
      break
    }
  }
}

export function serializeState(state: HMState): SavedHMState {
  return {
    score: state.score,
    level: state.levelWon ? state.level + 1 : state.level,
  }
}
