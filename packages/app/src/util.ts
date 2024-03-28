import { isInteger } from 'lodash-es'
import invariant from 'tiny-invariant'
import { Point } from './types.js'

export function toCellId({ x, y }: Point): string {
  invariant(isInteger(x))
  invariant(isInteger(y))
  return `${x}.${y}`
}
