import { useEffect, useMemo, useRef, useState } from 'react'
import { smooth } from './const.js'
import { Cursor, Path } from './types.js'
import { Vec2 } from './vec2.js'

function useTarget(cursor: Cursor, path: Path) {
  const next = useMemo(() => {
    const last = path.at(-1)
    if (last) {
      return last.b
    }
    return cursor.position
  }, [cursor, path])
  const target = useRef(next)
  useEffect(() => {
    target.current = next
  }, [next])
  return target
}

export function useCamera(
  cursor: Cursor,
  path: Path,
): Vec2 {
  const target = useTarget(cursor, path)
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
        return prev.add(
          d.norm().mul(smooth(d.len()) * elapsed),
        )
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
