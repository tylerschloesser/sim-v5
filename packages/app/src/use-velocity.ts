import { useMemo } from 'react'
import { MAX_SPEED } from './const.js'
import { Drag } from './types.js'
import { Vec2 } from './vec2.js'

export function useVelocity(
  scale: number | null,
  drag: Drag | null,
): Vec2 {
  const fromDrag = useMemo<Vec2 | null>(() => {
    if (scale === null) {
      return null
    }
    const start = drag?.events.at(0)?.position
    let end = drag?.events.at(-1)?.position
    if (end && start && end.equals(start)) {
      end = undefined
    }
    const dir = start && end ? end.sub(start) : null

    if (dir === null) {
      return null
    }

    // invert y direction
    dir.y *= -1

    const speed = Math.min(
      (dir.div(scale).len() + 1) ** 1.75 - 1,
      MAX_SPEED,
    )

    return dir.norm().mul(speed)
  }, [drag, scale])

  return fromDrag ?? new Vec2(0, 0)
}
