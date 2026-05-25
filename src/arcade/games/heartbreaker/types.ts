import type { HeartColor } from './constants'

export interface GridHeart {
  row: number
  col: number
  color: HeartColor
  popping: boolean
  popProgress: number  // 0→1
  dropping: boolean
  dropY: number        // pixel offset downward
  dropVY: number       // drop velocity
  slideY: number       // animated offset for row-push slide
}

export interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  color: HeartColor
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  r: number
}

export interface HBState {
  hearts: GridHeart[]
  currentColor: HeartColor
  nextColor: HeartColor
  projectile: Projectile | null
  score: number
  combo: number
  shotCount: number
  shotsThisLevel: number
  particles: Particle[]
  gameOver: boolean
  won: boolean
  hudDirty: boolean
  // pending float check after this many popping hearts finish
  pendingFloatCheck: boolean
}

export interface SavedHBState {
  hearts: Array<{ row: number; col: number; color: HeartColor }>
  currentColor: HeartColor
  nextColor: HeartColor
  score: number
  shotCount: number
  shotsThisLevel: number
}
