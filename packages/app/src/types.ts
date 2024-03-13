import * as z from 'zod'

export const World = z.strictObject({
  cells: z.record(z.string(), z.string()),
})
export type World = z.infer<typeof World>
