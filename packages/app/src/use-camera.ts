import { useEffect, useMemo, useRef, useState } from 'react'
import { Path } from './types.js'
import { Vec2 } from './vec2.js'

function useTarget(player: Vec2, path: Path) {
  const next = useMemo(() => {
    const last = path.at(-1)
    if (last) {
      return last.b
    }
    return player
  }, [player, path])
  const target = useRef(next)
  useEffect(() => {
    target.current = next
  }, [next])
  return target
}

export function useCamera(player: Vec2, path: Path): Vec2 {
  const target = useTarget(player, path)
  const [camera, setCamera] = useState(target.current)
  useEffect(() => {
    let handle: number
    let lastStep = self.performance.now()
    function step() {
      const now = self.performance.now()
      const elapsed = (now - lastStep) / 1000
      lastStep = now
      setCamera((prev) => {
        if (prev === target.current) {
          return prev
        }
        const d = target.current.sub(prev)
        if (d.len() < 1e-3) {
          return target.current
        }
        const speed = (d.len() + 1) ** 3 - 1
        return prev.add(d.norm().mul(speed * elapsed))
      })
      handle = self.requestAnimationFrame(step)
    }
    handle = self.requestAnimationFrame(step)
    return () => {
      self.cancelAnimationFrame(handle)
    }
  }, [])
  return camera
}
