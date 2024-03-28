import * as z from 'zod'
import { Vec2 } from './vec2.js'

export const CellType = z.enum(['Stone', 'Grass'])
export type CellType = z.infer<typeof CellType>

export const Cell = z.strictObject({
  type: CellType,
  color: z.string(),
})
export type Cell = z.infer<typeof Cell>

export const World = z.strictObject({
  cells: z.record(z.string(), Cell),
})
export type World = z.infer<typeof World>

export type PointerId = number

export interface Drag {
  pointerId: PointerId
  events: { time: number; position: Vec2 }[]
}

export type Path = Array<{
  a: Vec2
  b: Vec2
  v: Vec2
  t: number
  cell: Vec2
}>
