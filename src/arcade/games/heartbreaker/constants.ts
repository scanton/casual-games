export const COLS = 8          // even-row heart count
export const INITIAL_ROWS = 5
export const MIN_MATCH = 3
export const SHOTS_PER_NEW_ROW = 8
export const SPEED = 680       // projectile px/sec
export const POP_DURATION = 0.22   // seconds
export const DROP_GRAVITY = 1400   // px/sec²

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

// Palette used for initial grid (keeps 4-5 colors so matches happen often)
export const INITIAL_PALETTE: HeartColor[] = ['red', 'purple', 'teal']
