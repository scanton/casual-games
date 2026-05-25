import { LeaderboardEntry, SubmitScorePayload } from './types'
import { MOCK_LEADERBOARD } from './mockData'

const LEADERBOARD_ENDPOINT = process.env.NEXT_PUBLIC_LEADERBOARD_URL

export async function getLeaderboard(gameId?: string): Promise<LeaderboardEntry[]> {
  if (LEADERBOARD_ENDPOINT) {
    const url = gameId
      ? `${LEADERBOARD_ENDPOINT}?gameId=${encodeURIComponent(gameId)}`
      : LEADERBOARD_ENDPOINT
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Leaderboard fetch failed: ${res.status}`)
    return res.json()
  }

  const data = gameId
    ? MOCK_LEADERBOARD.filter((e) => e.gameId === gameId)
    : MOCK_LEADERBOARD
  return [...data].sort((a, b) => b.score - a.score).slice(0, 50)
}

export async function submitScore(payload: SubmitScorePayload): Promise<void> {
  if (LEADERBOARD_ENDPOINT) {
    const res = await fetch(LEADERBOARD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Score submit failed: ${res.status}`)
    return
  }

  // Simulated latency for dev
  await new Promise((r) => setTimeout(r, 600))
  console.log('[Arcade] Score submitted (mock):', payload)
}

export async function getPersonalBest(
  userId: string,
  gameId: string
): Promise<number | null> {
  if (LEADERBOARD_ENDPOINT) {
    const url = `${LEADERBOARD_ENDPOINT}/best?userId=${encodeURIComponent(userId)}&gameId=${encodeURIComponent(gameId)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return data.score ?? null
  }

  const entry = MOCK_LEADERBOARD.filter(
    (e) => e.userId === userId && e.gameId === gameId
  ).sort((a, b) => b.score - a.score)[0]
  return entry?.score ?? null
}
