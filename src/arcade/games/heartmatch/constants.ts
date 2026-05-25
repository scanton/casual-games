export const GRID_COLS = 8
export const GRID_ROWS = 8

export const SWAP_DURATION   = 0.15
export const REVERT_DURATION = 0.12
export const POP_DURATION    = 0.28
export const FALL_DURATION   = 0.42

export const BASE_CELL_SCORE  = 50
export const POWER_BONUS      = 300
export const WILD_BONUS       = 600
export const LOVE_SURGE_BONUS = 500

export const HUD_TOP = 56   // px reserved at top for HUD

export const SCORE_MILESTONES = [500, 1500, 4000, 10000] as const

export const HEART_COLORS = ['red', 'pink', 'coral', 'purple', 'teal', 'gold'] as const
export type HeartColor = typeof HEART_COLORS[number]

export const COLORS: Record<HeartColor, { base: string; light: string }> = {
  red:    { base: '#c42d3e', light: '#f87191' },
  pink:   { base: '#f472b6', light: '#fdf2f8' },
  coral:  { base: '#e05c3a', light: '#ff8a65' },
  purple: { base: '#7c3aed', light: '#a78bfa' },
  teal:   { base: '#0d9488', light: '#2dd4bf' },
  gold:   { base: '#d97706', light: '#fcd34d' },
}
