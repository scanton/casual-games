import type { HeartColor } from './constants'

export type TileType = 'normal' | 'power' | 'wild'
export type Phase = 'idle' | 'swapping' | 'reverting' | 'popping' | 'falling'

export interface Cell {
  row: number
  col: number
  color: HeartColor
  type: TileType
  animOffsetX: number
  animOffsetY: number
  popProgress: number  // 0→1 during pop animation
  popping: boolean
  locked: boolean
  iceCount: number     // 2 = fully iced, 1 = cracked, 0 = free
}

export interface Particle {
  x: number; y: number
  vx: number; vy: number
  color: string; alpha: number; r: number
}

export interface FloatingText {
  x: number; y: number; text: string; color: string; vy: number; alpha: number
}

export interface HMState {
  board: Cell[][]
  phase: Phase
  phaseTimer: number
  swapFrom: { row: number; col: number } | null
  swapTo:   { row: number; col: number } | null
  selected: { row: number; col: number } | null
  score: number      // cumulative total (for leaderboard)
  prevScore: number
  levelScore: number // points earned in current level only (for level advancement)
  moves: number
  level: number
  target: number
  cascadeCount: number
  particles: Particle[]
  floatingTexts: FloatingText[]
  levelBanner: number
  levelBannerText: string
  shakeX: number
  shakeY: number
  shakeTimer: number
  hintTimer: number   // seconds since last player move; resets on each swap attempt
  hintPair: [{ row: number; col: number }, { row: number; col: number }] | null
  gameOver: boolean
  levelWon: boolean
  levelWonTimer: number  // counts down from LEVEL_WIN_DELAY; triggers auto-advance
  hudDirty: boolean
  time: number
  colorCount: number
}

export interface SavedHMState {
  score: number
  level: number
}
