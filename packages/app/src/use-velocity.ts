import { useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
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

  const [fromRelease, setFromRelease] =
    useState<Vec2 | null>(null)

  const prevFromDrag = useRef<Vec2 | null>(fromDrag)

  useEffect(() => {
    if (fromDrag) {
      setFromRelease(null)
    }
  }, [fromDrag])

  useEffect(() => {
    if (fromDrag || !prevFromDrag.current) {
      return
    }

    invariant(prevFromDrag.current)
    setFromRelease(prevFromDrag.current)

    let handle: number | null

    const startVelocity = prevFromDrag.current
    const startRelease = self.performance.now()

    const duration = 500

    function step() {
      const now = self.performance.now()
      const dt = now - startRelease
      invariant(dt >= 0)
      if (dt >= duration) {
        setFromRelease(null)
        handle = null
      } else {
        const speed =
          startVelocity.len() * (1 - (dt / duration) ** 2)
        setFromRelease(startVelocity.norm().mul(speed))
        handle = self.requestAnimationFrame(step)
      }
    }
    handle = self.requestAnimationFrame(step)
    return () => {
      if (handle) {
        self.cancelAnimationFrame(handle)
      }
    }
  }, [fromDrag])

  useEffect(() => {
    prevFromDrag.current = fromDrag
  }, [fromDrag])

  return fromDrag ?? fromRelease ?? new Vec2(0, 0)
}
