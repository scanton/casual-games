'use client'

import { GameProps } from '../../lib/types'
import GamePlaceholder from '../../components/GamePlaceholder'

export default function HeartBeat(props: GameProps) {
  return (
    <GamePlaceholder
      {...props}
      title="HeartBeat"
      description="Tap the heart to generate love. Unlock upgrades to grow your heart empire!"
      devScore={512900}
    />
  )
}
