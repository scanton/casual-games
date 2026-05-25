# Heartstamp Arcade — TODO

## Games to Build

- [ ] **HeartMatch** — Match 3 (Candy Crush / Bejeweled style)
  - Swap adjacent colored hearts in a grid (e.g. 8×8)
  - Clear 3+ in a row/column for points; 4+ creates power-up hearts
  - Combos and cascades multiply score
  - Time-limited or move-limited rounds

- [ ] **HeartBreaker** — Bubble Shooter
  - Shoot colored hearts upward from a launcher at the bottom
  - Match 3+ same-colored hearts to pop the cluster
  - Trajectory preview line for aim assist
  - Hearts descend toward the player over time

- [ ] **HeartStrings** — Snake
  - Player controls a growing chain of hearts through a grid
  - Collect scattered love tokens to grow the chain and score points
  - Avoid walls and your own tail
  - Speed increases as the chain grows

- [ ] **HeartBeat** — Clicker / Idle
  - Tap/click a central heart to generate "love points"
  - Spend points on upgrades (auto-clickers, multipliers, etc.)
  - Idle mechanic: love accumulates over time when away
  - Prestige system for replayability

## Infrastructure

- [ ] Real leaderboard API endpoint (replace `NEXT_PUBLIC_LEADERBOARD_URL` stub)
- [ ] Replace placeholder thumbnails with real game screenshots
- [ ] Wire in parent app's auth user object
- [ ] Add display name change flow from the lobby (settings icon)
- [ ] Publish as versioned npm/pnpm package for parent app consumption
- [ ] Add analytics / game event tracking hooks
- [ ] Vercel preview deployment for internal QA

## Design

- [ ] Create game thumbnail/screenshot assets once each game is built
- [ ] Lobby header logo / wordmark asset
- [ ] Add subtle background pattern or particle effect to lobby
- [ ] Sound effect hooks (muted by default, toggleable)
