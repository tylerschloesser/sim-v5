import { useEffect, useState } from 'react'
import { Cursor } from './types.js'
import { Vec2 } from './vec2.js'

export function usePlayer(cursor: Cursor): Vec2 {
  const [player, setPlayer] = useState(cursor.position)

  useEffect(() => {
    let handle: number | null
    let lastStep = self.performance.now()
    function step() {
      const now = self.performance.now()
      const elapsed = (now - lastStep) / 1000
      lastStep = now
      setPlayer((prev) => {
        const d = cursor.position.sub(prev)
        if (d.len() < 1e-3) {
          handle = null
          return cursor.position
        }
        handle = self.requestAnimationFrame(step)

        const speed = (d.len() + 1) ** 3 - 1
        return prev.add(d.norm().mul(speed * elapsed))
      })
    }
    handle = self.requestAnimationFrame(step)
    return () => {
      if (handle !== null) {
        self.cancelAnimationFrame(handle)
      }
    }
  }, [cursor])

  return player
}
