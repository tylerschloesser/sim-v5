import { Vec2 } from './vec2.js'

export const ALLOW_MOVE: boolean = true
export const SHOW_GRID: boolean = true
export const SHOW_PATH: boolean = false
export const SHOW_TARGET_CELL: boolean = true

export const MAX_SPEED = 20

// How far ahead (in seconds) to simulate the path.
// The time step cannot be greater than this.
export const PATH_TIME = 0.5

export function getScale(viewport: Vec2 | null) {
  if (viewport === null) {
    return null
  }
  return Math.min(viewport.x, viewport.y) / 8
}
