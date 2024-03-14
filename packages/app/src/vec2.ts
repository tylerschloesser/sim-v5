import invariant from 'tiny-invariant'

export class Vec2 {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y)
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y)
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
    return new Vec2(this.x / len, this.y / len)
  }

  floor(): Vec2 {
    return new Vec2(Math.floor(this.x), Math.floor(this.y))
  }
}
