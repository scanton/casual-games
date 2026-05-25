import { GameConfig } from './types'
import HeartMatch from '../games/heartmatch'
import HeartBreaker from '../games/heartbreaker'
import HeartStrings from '../games/heartstrings'
import HeartBeat from '../games/heartbeat'

export const GAMES: GameConfig[] = [
  {
    id: 'heartmatch',
    title: 'HeartMatch',
    description: 'Swap and match colored hearts in a grid to score big. Chain combos for massive points!',
    tags: ['puzzle', 'match-3'],
    available: true,
    accentColor: '#BE1E2E',
    thumbnail: '/thumbnails/heartmatch.png',
    component: HeartMatch,
  },
  {
    id: 'heartstrings',
    title: 'HeartStrings',
    description: 'Guide your growing chain of hearts through the board. Eat love tokens — avoid your own tail!',
    tags: ['arcade', 'snake'],
    available: true,
    accentColor: '#a01828',
    thumbnail: '/thumbnails/heartstrings.png',
    component: HeartStrings,
  },
  {
    id: 'heartbreaker',
    title: 'HeartBreaker',
    description: 'Aim and shoot colored hearts upward to break matching clusters before they reach you.',
    tags: ['arcade', 'shooter'],
    available: true,
    accentColor: '#c42d3e',
    thumbnail: '/thumbnails/heartbreaker.png',
    component: HeartBreaker,
  },
  {
    id: 'heartbeat',
    title: 'HeartBeat',
    description: 'Tap the heart to generate love. Unlock upgrades to grow your heart empire into the millions.',
    tags: ['clicker', 'idle'],
    available: false,
    accentColor: '#d4304a',
    component: HeartBeat,
  },
]

export function getGame(id: string): GameConfig | undefined {
  return GAMES.find((g) => g.id === id)
}
