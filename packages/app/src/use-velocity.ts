import { useMemo } from 'react'
import { MAX_SPEED, smooth } from './const.js'
import { Drag } from './types.js'
import { Vec2 } from './vec2.js'

const ZERO = new Vec2(0, 0)

export function useVelocity(
  scale: number | null,
  drag: Drag | null,
): Vec2 {
  return useMemo<Vec2>(() => {
    if (scale === null) {
      return ZERO
    }
    const start = drag?.events.at(0)?.position
    let end = drag?.events.at(-1)?.position
    if (end && start && end.equals(start)) {
      end = undefined
    }
    let dir = start && end ? end.sub(start) : null

    if (dir === null) {
      return ZERO
    }

    if (dir.len() <= scale) {
      return ZERO
    }
    dir = dir
      .norm()
      // shorten the vector a bit, so that we start closer to zero
      // (but not quite zero)
      .mul(dir.len() - scale / 2)
      .map(({ x, y }) => ({
        x,
        // invert y direction
        y: -y,
      }))

    const speed = Math.min(
      smooth(dir.div(scale).len(), 1.75),
      MAX_SPEED,
    )

    return dir.norm().mul(speed)
  }, [drag, scale])
}
