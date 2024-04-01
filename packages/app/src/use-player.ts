import { useEffect, useMemo, useRef, useState } from 'react'
import { smooth } from './const.js'
import { Cursor, Path } from './types.js'
import { Vec2 } from './vec2.js'

function useTarget(
  cursor: Cursor,
  path: Path,
): React.MutableRefObject<Vec2> {
  const target = useMemo<Vec2>(() => {
    const last = path.at(-1)
    if (!last) {
      return cursor.point.add(0.5)
    }
    const v = last.b.sub(cursor.position)
    return cursor.position.add(v.div(2))
  }, [cursor, path])
  const ref = useRef(target)
  useEffect(() => {
    ref.current = target
  }, [target])
  return ref
}

export function usePlayer(
  cursor: Cursor,
  path: Path,
): Vec2 {
  const [player, setPlayer] = useState(
    cursor.point.add(0.5),
  )

  const target = useTarget(cursor, path)

  useEffect(() => {
    let handle: number
    let lastStep = self.performance.now()
    function step() {
      const now = self.performance.now()
      const elapsed = (now - lastStep) / 1000
      lastStep = now

      setPlayer((prev) => {
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

  return player
}
