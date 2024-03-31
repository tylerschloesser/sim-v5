import invariant from 'tiny-invariant'
import { mod } from './math.js'

export class Vec2 {
  x: number
  y: number

  constructor(v: { x: number; y: number })
  constructor(x: number, y: number)
  constructor(
    x: number | { x: number; y: number },
    y?: number,
  ) {
    if (x instanceof Object) {
      invariant(typeof y === 'undefined')
      this.x = x.x
      this.y = x.y
    } else {
      invariant(typeof y === 'number')
      invariant(!Number.isNaN(x))
      invariant(!Number.isNaN(y))
      this.x = x
      this.y = y
    }
  }

  add(v: Vec2 | number): Vec2 {
    if (typeof v === 'number') {
      return new Vec2(this.x + v, this.y + v)
    } else {
      return new Vec2(this.x + v.x, this.y + v.y)
    }
  }

  sub(v: Vec2 | number): Vec2 {
    if (typeof v === 'number') {
      return new Vec2(this.x - v, this.y - v)
    } else {
      return new Vec2(this.x - v.x, this.y - v.y)
    }
  }

  mul(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s)
  }

  div(s: number): Vec2 {
    invariant(s !== 0)
    return new Vec2(this.x / s, this.y / s)
  }

  len(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2)
  }

  norm(): Vec2 {
    const len = this.len()
    if (len === 0) {
      return this
    }
    return new Vec2(this.x / len, this.y / len)
  }

  floor(): Vec2 {
    return new Vec2(Math.floor(this.x), Math.floor(this.y))
  }

  mod(m: number): Vec2 {
    return new Vec2(mod(this.x, m), mod(this.y, m))
  }

  equals(v: Vec2): boolean {
    return this.x === v.x && this.y === v.y
  }

  cross(v: Vec2): number {
    return this.x * v.y - this.y * v.x
  }
}
