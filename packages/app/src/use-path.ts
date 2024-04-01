import { useMemo } from 'react'
import invariant from 'tiny-invariant'
import { PATH_TIME } from './const.js'
import { mod } from './math.js'
import {
  Cell,
  Path,
  Cursor,
  World,
  CellType,
  Point,
} from './types.js'
import { toCellId } from './util.js'
import { Vec2 } from './vec2.js'

function isCellBlocked(cell: Cell | undefined): boolean {
  if (cell === undefined) {
    return true
  }
  if (cell.type === CellType.enum.Stone) {
    return true
  }
  return false
}

export function usePath(
  cursor: Cursor,
  velocity: Vec2,
  world: World,
): Path {
  return useMemo(() => {
    if (velocity.len() === 0) {
      return []
    }

    const stepX = Math.sign(velocity.x)
    const stepY = Math.sign(velocity.y)
    let { x, y } = cursor.position
    const path: Path = []
    let u = cursor.position

    let time = 0
    while (time !== PATH_TIME) {
      let point = new Vec2(
        stepX < 0 && x % 1 === 0 ? x - 1 : Math.floor(x),
        stepY < 0 && y % 1 === 0 ? y - 1 : Math.floor(y),
      )
      invariant(point.x % 1 === 0)
      invariant(point.y % 1 === 0)
      const cellId = toCellId(point)
      const cell = world.cells[cellId]

      let v: Vec2 | null = velocity

      let blockedBy: Point | undefined = undefined

      if (isCellBlocked(cell)) {
        blockedBy = point

        if (x % 1 === 0 && y % 1 === 0) {
          //
          // we are in the corner, first attempt to move along the
          // velocity axis with the larger magnitude, then try the
          // other axis
          //
          const order: ['x', 'y'] | ['y', 'x'] =
            Math.abs(v.x) > Math.abs(v.y)
              ? ['x', 'y']
              : ['y', 'x']

          let found = false

          for (const axis of order) {
            if (axis === 'x') {
              const adjacentPoint = new Vec2(
                point.x,
                point.y - stepY,
              )
              const adjacentId = `${adjacentPoint.x}.${adjacentPoint.y}`
              const adjacent = world.cells[adjacentId]
              if (!isCellBlocked(adjacent)) {
                point = adjacentPoint
                v = new Vec2(v.x, 0)
                found = true
                break
              }
            } else {
              invariant(axis === 'y')
              const adjacentPoint = new Vec2(
                point.x - stepX,
                point.y,
              )
              const adjacentId = `${adjacentPoint.x}.${adjacentPoint.y}`
              const adjacent = world.cells[adjacentId]
              if (!isCellBlocked(adjacent)) {
                point = adjacentPoint
                v = new Vec2(0, v.y)
                found = true
                break
              }
            }
          }
          if (!found) {
            v = null
          }
        } else if (x % 1 === 0) {
          //
          // we are on the y axis, attempt to move in the y direction
          //
          const adjacentPoint = new Vec2(
            point.x - stepX,
            point.y,
          )
          const adjacentId = `${adjacentPoint.x}.${adjacentPoint.y}`
          const adjacent = world.cells[adjacentId]
          if (isCellBlocked(adjacent)) {
            v = null
          } else {
            point = adjacentPoint
            v = new Vec2(0, v.y)
          }
        } else if (y % 1 === 0) {
          //
          // we are on the x axis, attempt to move in the x direction
          //
          const adjacentPoint = new Vec2(
            point.x,
            point.y - stepY,
          )
          const adjacentId = `${adjacentPoint.x}.${adjacentPoint.y}`
          const adjacent = world.cells[adjacentId]
          if (isCellBlocked(adjacent)) {
            v = null
          } else {
            point = adjacentPoint
            v = new Vec2(v.x, 0)
          }
        } else {
          invariant(false)
        }
      }

      if (v === null || v.len() === 0) {
        break
      }

      const tMaxX =
        v.x === 0
          ? Number.POSITIVE_INFINITY
          : Math.abs((stepX - mod(x, stepX)) / v.x)

      const tMaxY =
        v.y === 0
          ? Number.POSITIVE_INFINITY
          : Math.abs((stepY - mod(y, stepY)) / v.y)

      let t = tMaxX < tMaxY ? tMaxX : tMaxY

      invariant(t > 0)

      if (time + t > PATH_TIME) {
        t = PATH_TIME - time
        time = PATH_TIME
      } else {
        time += t
      }

      invariant(t >= 0)
      const du = v.mul(t)

      const a = u

      u = u.add(du)

      x += du.x
      y += du.y

      // prettier-ignore
      if (Math.abs(u.x - Math.round(u.x)) <= Number.EPSILON) {
        u.x = Math.round(u.x)
      }
      if (Math.abs(x - Math.round(x)) <= Number.EPSILON) {
        x = Math.round(x)
      }
      // prettier-ignore
      if (Math.abs(u.y - Math.round(u.y)) <= Number.EPSILON) {
        u.y = Math.round(u.y)
      }
      if (Math.abs(y - Math.round(y)) <= Number.EPSILON) {
        y = Math.round(y)
      }

      const b = u

      path.push({
        a,
        b,
        t,
        v,
        point,
        blockedBy,
      })
    }

    return path
  }, [cursor, velocity, world])
}
