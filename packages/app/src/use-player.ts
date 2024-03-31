import { useEffect, useRef, useState } from 'react'
import { Cursor } from './types.js'
import { Vec2 } from './vec2.js'

export function usePlayer(cursor: Cursor): Vec2 {
  const [player, setPlayer] = useState(cursor.position)

  const target = useRef(cursor.position)
  useEffect(() => {
    target.current = cursor.position
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
        const speed = (d.len() + 1) ** 2.5 - 1
        return prev.add(d.norm().mul(speed * elapsed))
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
