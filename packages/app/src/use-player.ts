import { useEffect, useRef, useState } from 'react'
import { smooth } from './const.js'
import { Cursor } from './types.js'
import { Vec2 } from './vec2.js'

export function usePlayer(cursor: Cursor): Vec2 {
  const [player, setPlayer] = useState(
    cursor.point.add(0.5),
  )

  const target = useRef(cursor.position)
  useEffect(() => {
    target.current = cursor.point.add(0.5)
  }, [cursor])

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
