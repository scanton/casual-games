export interface ArcadeUser {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
}

export interface GameProps<T = unknown> {
  user: ArcadeUser
  savedState: T | null
  onSaveState: (state: T) => void
  onGameOver: (score: number) => void
}

export interface GameConfig {
  id: string
  title: string
  description: string
  thumbnail?: string
  tags: string[]
  available: boolean
  accentColor: string
  component: React.ComponentType<GameProps>
}

export interface LeaderboardEntry {
  id: string
  userId: string
  displayName: string
  gameId: string
  score: number
  createdAt: string
}

export interface SubmitScorePayload {
  userId: string
  displayName: string
  gameId: string
  score: number
}
