import { World } from './types.js'

export function initWorld(): World {
  const cells: World['cells'] = {}

  cells['1.2'] = 'blue'

  return { cells }
}
