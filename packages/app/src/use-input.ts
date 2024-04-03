import { useMemo } from 'react'
import { MAX_SPEED, smooth } from './const.js'
import { Drag, Input, InputType } from './types.js'

export function useInput(
  scale: number | null,
  drag: Drag | null,
): Input | null {
  return useMemo<Input | null>(() => {
    if (
      scale === null ||
      drag === null ||
      drag.end === null
    ) {
      return null
    }
    const {
      start: { position: start },
      end: { position: end },
    } = drag

    let dir = end.sub(start)
    const threshold = scale * 1.5

    if (dir.len() <= threshold) {
      return { type: InputType.Action }
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

    return {
      type: InputType.Move,
      v: dir.norm().mul(speed),
    }
  }, [drag, scale])
}
