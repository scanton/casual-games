export const GRID_COLS = 20
export const GRID_ROWS = 20

export const BASE_MOVE_INTERVAL = 0.28   // seconds per cell at level 1
export const MIN_MOVE_INTERVAL  = 0.08   // fastest possible

export const TOKENS_PER_LEVEL = 8        // food eaten before level-up
export const WRAP_LEVEL       = 3        // level where walls wrap (no death)

export const RAINBOW_DURATION  = 5.0     // seconds of tail-immunity
export const COMBO_WINDOW      = 3.5     // seconds to keep combo alive
export const COMBO_FOR_RAINBOW = 5       // combo count that triggers rainbow

export const ARROW_LIFETIME    = 6.5     // seconds before cupid arrow vanishes

// levels at which special foods unlock
export const PASSION_LEVEL    = 2
export const HEARTBREAK_LEVEL = 3
export const ARROW_LEVEL      = 4

export const SCORE_MILESTONES = [500, 1500, 4000, 10000] as const

export const HEART_COLORS = ['red', 'pink', 'coral', 'purple', 'teal', 'gold'] as const
export type HeartColor = (typeof HEART_COLORS)[number]

export const COLORS: Record<HeartColor, { base: string; light: string }> = {
  red:    { base: '#BE1E2E', light: '#F0596A' },
  pink:   { base: '#f472b6', light: '#fdf2f8' },
  coral:  { base: '#D84315', light: '#FF7043' },
  purple: { base: '#6D28D9', light: '#A78BFA' },
  teal:   { base: '#0D9488', light: '#2DD4BF' },
  gold:   { base: '#B45309', light: '#FCD34D' },
}

export const FOOD_COLORS: Record<string, HeartColor> = {
  love:       'pink',
  passion:    'coral',
  heartbreak: 'purple',
  arrow:      'gold',
}
