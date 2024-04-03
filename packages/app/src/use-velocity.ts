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
    if (
      scale === null ||
      drag === null ||
      drag.end === null
    ) {
      return ZERO
    }
    const {
      start: { position: start },
      end: { position: end },
    } = drag

    let dir = end.sub(start)
    const threshold = scale * 1.5

    if (dir.len() <= threshold) {
      return ZERO
    }
    dir = dir
      .norm()
      // shorten the vector a bit, so that we start closer to zero
      // (but not quite zero)
      .mul(dir.len() - threshold / 2)
      // invert y direction (DOM y is down, ours is up)
      .map(({ x, y }) => ({ x, y: -y }))

    const speed = Math.min(
      smooth(dir.div(scale).len(), 1.75),
      MAX_SPEED,
    )

    return dir.norm().mul(speed)
  }, [drag, scale])
}
