import { useState } from 'react'
import { Cursor } from './types.js'
import { Vec2 } from './vec2.js'

export function usePlayer(cursor: Cursor): Vec2 {
  const [player, setPlayer] = useState(cursor.position)
  return player
}
