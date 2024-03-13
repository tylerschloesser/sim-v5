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

  mul(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s)
  }
}
