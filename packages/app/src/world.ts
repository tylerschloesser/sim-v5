import { CellType, World } from './types.js'
import { Vec2 } from './vec2.js'

export function initWorld(): World {
  const cells: World['cells'] = {}

  const translate = new Vec2(-2, -4)
  const { x: tx, y: ty } = translate

  const center = new Vec2(0, 0)
  for (let x = -20; x < 20; x++) {
    for (let y = -20; y < 20; y++) {
      const position = new Vec2(x, y)
      const dist = Math.floor(center.sub(position).len())
      if (dist === 7) {
        const id = `${x + tx}.${y + ty}`
        const hue = 0
        const saturation = 0
        const lightness = 20 + Math.random() * 20
        const color = `hsl(${hue}, ${saturation.toFixed(2)}%, ${lightness.toFixed(2)}%)`
        cells[id] = {
          type: CellType.enum.Stone,
          color,
        }
      } else if (dist < 7) {
        const id = `${x + tx}.${y + ty}`
        const hue = 120
        const saturation = 40 + Math.random() * 10
        const lightness = 20 + Math.random() * 10
        const color = `hsl(${hue}, ${saturation.toFixed(2)}%, ${lightness.toFixed(2)}%)`
        cells[id] = {
          type: CellType.enum.Grass,
          color,
        }
      }
    }
  }

  return { cells }
}
