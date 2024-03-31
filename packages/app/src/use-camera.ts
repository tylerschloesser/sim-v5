import { useEffect, useState } from 'react'
import { Vec2 } from './vec2.js'

export function useCamera(player: Vec2): Vec2 {
  const [camera, setCamera] = useState(player)
  useEffect(() => {
    let handle: number | null
    let lastStep = self.performance.now()
    function step() {
      const now = self.performance.now()
      const elapsed = (now - lastStep) / 1000
      lastStep = now
      setCamera((prev) => {
        const d = player.sub(prev)
        if (d.len() < 1e-3) {
          handle = null
          return player
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
  }, [player])

  return camera
}
