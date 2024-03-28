import { Point } from './types.js'

export function toCellId({ x, y }: Point): string {
  return `${x}.${y}`
}
