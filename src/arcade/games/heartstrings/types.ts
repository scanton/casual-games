export type Direction = 'up' | 'down' | 'left' | 'right'
export type FoodType  = 'love' | 'passion' | 'heartbreak' | 'arrow'

export interface Segment {
  row: number
  col: number
}

export interface Food {
  row: number
  col: number
  type: FoodType
  age: number        // seconds since spawned
  animPhase: number  // continuous animation accumulator
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

export interface FloatingText {
  x: number
  y: number
  text: string
  color: string
  vy: number
  alpha: number
}

export interface HSState {
  segments:     Segment[]
  prevSegments: Segment[]   // snapshot before last move tick (for lerp)
  direction:    Direction
  nextDir:      Direction
  moveInterval: number      // seconds between move ticks
  moveTimer:    number      // accumulates dt; tick when >= moveInterval
  moveProgress: number      // 0-1, fraction of way through current step
  foods:        Food[]
  score:        number
  prevScore:    number      // milestone detection
  level:        number
  tokensEaten:  number
  tokensThisLevel: number
  combo:        number
  comboTimer:   number      // counts down; eating food resets it
  rainbowTimer: number      // > 0 = tail-immunity active
  pulseTimer:   number      // brief scale pulse on all hearts after eating
  particles:    Particle[]
  floatingTexts: FloatingText[]
  gameOver:     boolean
  hudDirty:     boolean
  levelBanner:  number      // countdown; > 0 = show banner
  levelBannerText: string
  time:         number      // total elapsed seconds (for animations)
}

export interface SavedHSState {
  segments:    Segment[]
  direction:   Direction
  score:       number
  level:       number
  tokensEaten: number
}
