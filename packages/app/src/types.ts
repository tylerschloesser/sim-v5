import * as z from 'zod'

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
