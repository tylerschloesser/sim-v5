import { World } from './types.js'
import { Vec2 } from './vec2.js'

export function initWorld(): World {
  const cells: World['cells'] = {}

  const translate = new Vec2(-2, -4)
  const { x: tx, y: ty } = translate

  for (const [x, y] of [
    [1, 0],
    [2, 0],
    [3, 1],
    [4, 0],
    [5, 0],
    [6, 1],
    [5, 2],
    [4, 3],
    [5, 4],
    [6, 5],
    [6, 6],
    [6, 7],
    [5, 8],
    [4, 8],
    [3, 7],
    [2, 7],
    [1, 8],
    [0, 9],
    [-1, 9],
    [-2, 9],
    [-3, 8],
    [-3, 7],
    [-2, 6],
    [-1, 5],
    [0, 5],
    [-1, 4],
    [-1, 3],
    [0, 2],
    [0, 1],
  ] as [number, number][]) {
    const id = `${x + tx}.${y + ty}`
    const hue = 0
    const saturation = 40 + Math.random() * 20
    const lightness = 40 + Math.random() * 20
    cells[id] =
      `hsl(${hue}, ${saturation.toFixed(2)}%, ${lightness.toFixed(2)}%)`
  }

  return { cells }
}
