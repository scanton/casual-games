'use client'

import { useEffect, useState } from 'react'
import { Router, Route, Switch } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import { ArcadeUser } from '../lib/types'
import GameLobby from './GameLobby'
import GameShell from './GameShell'
import Leaderboard from './Leaderboard'

interface Props {
  user: ArcadeUser
}

export default function ArcadeApp({ user }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center">
        <span className="text-[#BE1E2E] text-5xl animate-pulse select-none">♥</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      <Router hook={useHashLocation}>
        <Switch>
          <Route path="/" component={() => <GameLobby user={user} />} />
          <Route
            path="/games/:id"
            component={({ params }: { params: { id: string } }) => (
              <GameShell user={user} gameId={params.id} />
            )}
          />
          <Route path="/leaderboard" component={() => <Leaderboard />} />
          <Route
            path="/leaderboard/:id"
            component={({ params }: { params: { id: string } }) => (
              <Leaderboard gameId={params.id} />
            )}
          />
          <Route component={() => <GameLobby user={user} />} />
        </Switch>
      </Router>
    </div>
  )
}
