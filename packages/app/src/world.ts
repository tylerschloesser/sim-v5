import Prando from 'prando'
import { CellType, World } from './types.js'
import { Vec2 } from './vec2.js'

const rng = new Prando(0)

export function getCellColor(type: CellType): string {
  switch (type) {
    case CellType.enum.Stone: {
      const hue = 0
      const saturation = 0
      const lightness = 20 + rng.next() * 20
      return `hsl(${hue}, ${saturation.toFixed(2)}%, ${lightness.toFixed(2)}%)`
    }
    case CellType.enum.Grass: {
      const hue = 120
      const saturation = 40 + rng.next() * 10
      const lightness = 20 + rng.next() * 10
      return `hsl(${hue}, ${saturation.toFixed(2)}%, ${lightness.toFixed(2)}%)`
    }
  }
}

export function initWorld(): World {
  const cells: World['cells'] = {}

  const center = new Vec2(0, 0)
  for (let x = -20; x < 20; x++) {
    for (let y = -20; y < 20; y++) {
      const position = new Vec2(x, y)
      const dist = Math.floor(center.sub(position).len())

      let type: CellType | null = null
      if (dist === 7) {
        type = CellType.enum.Stone
      } else if (dist < 7) {
        type = CellType.enum.Grass
      }
      if (type) {
        const color = getCellColor(type)
        cells[`${x}.${y}`] = { type, color }
      }
    }
  }

  return { cells }
}
