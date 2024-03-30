import { Player } from './types.js'
import { Vec2 } from './vec2.js'

export function useCamera(player: Player): Vec2 {
  const camera = player.position
  return camera
}
