import { World } from './types.js'

export function initWorld(): World {
  const cells: World['cells'] = {}

  const size = 10

  for (let x = 0; x < size; x++) {
    const id = `${x - Math.floor(size / 2)}.${-Math.floor(size / 2)}`
    const hue = 0
    const saturation = 40 + Math.random() * 20
    const lightness = 40 + Math.random() * 20
    cells[id] = `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  return { cells }
}
