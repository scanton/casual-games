import { LeaderboardEntry } from './types'

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  // HeartMatch
  { id: '1',  userId: 'u1', displayName: 'LoveQueen',   gameId: 'heartmatch',   score: 48250,  createdAt: '2024-01-15T10:30:00Z' },
  { id: '2',  userId: 'u2', displayName: 'HeartHunter', gameId: 'heartmatch',   score: 42100,  createdAt: '2024-01-14T14:22:00Z' },
  { id: '3',  userId: 'u3', displayName: 'CupidPro',    gameId: 'heartmatch',   score: 38750,  createdAt: '2024-01-13T09:15:00Z' },
  { id: '4',  userId: 'u4', displayName: 'ValentineX',  gameId: 'heartmatch',   score: 31200,  createdAt: '2024-01-12T16:45:00Z' },
  { id: '5',  userId: 'u5', displayName: 'BeatMaster',  gameId: 'heartmatch',   score: 28900,  createdAt: '2024-01-11T11:20:00Z' },
  { id: '6',  userId: 'u6', displayName: 'HeartStar',   gameId: 'heartmatch',   score: 24600,  createdAt: '2024-01-10T08:00:00Z' },
  { id: '7',  userId: 'u7', displayName: 'LoverBoy',    gameId: 'heartmatch',   score: 19400,  createdAt: '2024-01-09T19:30:00Z' },
  { id: '8',  userId: 'u8', displayName: 'HeartAce',    gameId: 'heartmatch',   score: 15800,  createdAt: '2024-01-08T12:00:00Z' },

  // HeartBreaker
  { id: '9',  userId: 'u1', displayName: 'LoveQueen',   gameId: 'heartbreaker', score: 24800,  createdAt: '2024-01-15T11:00:00Z' },
  { id: '10', userId: 'u6', displayName: 'HeartStar',   gameId: 'heartbreaker', score: 22300,  createdAt: '2024-01-14T15:30:00Z' },
  { id: '11', userId: 'u3', displayName: 'CupidPro',    gameId: 'heartbreaker', score: 19500,  createdAt: '2024-01-13T10:00:00Z' },
  { id: '12', userId: 'u7', displayName: 'LoverBoy',    gameId: 'heartbreaker', score: 17200,  createdAt: '2024-01-12T17:00:00Z' },
  { id: '13', userId: 'u8', displayName: 'HeartAce',    gameId: 'heartbreaker', score: 15800,  createdAt: '2024-01-11T12:00:00Z' },
  { id: '14', userId: 'u2', displayName: 'HeartHunter', gameId: 'heartbreaker', score: 13200,  createdAt: '2024-01-10T09:00:00Z' },
  { id: '15', userId: 'u4', displayName: 'ValentineX',  gameId: 'heartbreaker', score: 11400,  createdAt: '2024-01-09T20:00:00Z' },
  { id: '16', userId: 'u5', displayName: 'BeatMaster',  gameId: 'heartbreaker', score: 9800,   createdAt: '2024-01-08T13:00:00Z' },

  // HeartStrings
  { id: '17', userId: 'u2', displayName: 'HeartHunter', gameId: 'heartstrings', score: 9820,   createdAt: '2024-01-15T12:00:00Z' },
  { id: '18', userId: 'u6', displayName: 'HeartStar',   gameId: 'heartstrings', score: 8650,   createdAt: '2024-01-14T16:00:00Z' },
  { id: '19', userId: 'u4', displayName: 'ValentineX',  gameId: 'heartstrings', score: 7430,   createdAt: '2024-01-13T11:00:00Z' },
  { id: '20', userId: 'u5', displayName: 'BeatMaster',  gameId: 'heartstrings', score: 6210,   createdAt: '2024-01-12T18:00:00Z' },
  { id: '21', userId: 'u1', displayName: 'LoveQueen',   gameId: 'heartstrings', score: 5980,   createdAt: '2024-01-11T13:00:00Z' },
  { id: '22', userId: 'u8', displayName: 'HeartAce',    gameId: 'heartstrings', score: 4760,   createdAt: '2024-01-10T10:00:00Z' },
  { id: '23', userId: 'u3', displayName: 'CupidPro',    gameId: 'heartstrings', score: 3540,   createdAt: '2024-01-09T21:00:00Z' },
  { id: '24', userId: 'u7', displayName: 'LoverBoy',    gameId: 'heartstrings', score: 2890,   createdAt: '2024-01-08T14:00:00Z' },

  // HeartBeat
  { id: '25', userId: 'u8', displayName: 'HeartAce',    gameId: 'heartbeat',    score: 892450, createdAt: '2024-01-15T13:00:00Z' },
  { id: '26', userId: 'u3', displayName: 'CupidPro',    gameId: 'heartbeat',    score: 754320, createdAt: '2024-01-14T17:00:00Z' },
  { id: '27', userId: 'u7', displayName: 'LoverBoy',    gameId: 'heartbeat',    score: 623180, createdAt: '2024-01-13T12:00:00Z' },
  { id: '28', userId: 'u2', displayName: 'HeartHunter', gameId: 'heartbeat',    score: 512900, createdAt: '2024-01-12T19:00:00Z' },
  { id: '29', userId: 'u5', displayName: 'BeatMaster',  gameId: 'heartbeat',    score: 401250, createdAt: '2024-01-11T14:00:00Z' },
  { id: '30', userId: 'u1', displayName: 'LoveQueen',   gameId: 'heartbeat',    score: 298700, createdAt: '2024-01-10T11:00:00Z' },
  { id: '31', userId: 'u6', displayName: 'HeartStar',   gameId: 'heartbeat',    score: 187400, createdAt: '2024-01-09T22:00:00Z' },
  { id: '32', userId: 'u4', displayName: 'ValentineX',  gameId: 'heartbeat',    score: 94200,  createdAt: '2024-01-08T15:00:00Z' },
]
