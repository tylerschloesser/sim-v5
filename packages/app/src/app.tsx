import { useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { Updater, useImmer } from 'use-immer'
import * as z from 'zod'
import styles from './app.module.scss'
import { mod, radiansToDegrees } from './math.js'
import { CellType, World } from './types.js'
import { Vec2 } from './vec2.js'
import { initWorld } from './world.js'

const ALLOW_MOVE: boolean = true
const SHOW_GRID: boolean = true
const SHOW_PATH: boolean = true
const SHOW_TARGET_CELL: boolean = false

type PointerId = number

interface Drag {
  pointerId: PointerId
  events: { time: number; position: Vec2 }[]
}

type Path = Array<{
  a: Vec2
  b: Vec2
  v: Vec2
  dist: number
  cell: Vec2
}>

function useVelocity(
  scale: number | null,
  drag: Drag | null,
): Vec2 {
  return useMemo<Vec2>(() => {
    if (scale === null) {
      return new Vec2(0, 0)
    }
    const start = drag?.events.at(0)?.position
    let end = drag?.events.at(-1)?.position
    if (end && start && end.equals(start)) {
      end = undefined
    }
    const dir =
      start && end ? end.sub(start) : new Vec2(0, 0)

    // invert y direction
    dir.y *= -1

    return dir.div(scale)
  }, [drag, scale])
}

function usePath(
  player: Vec2,
  velocity: Vec2,
  world: World,
): Path {
  return useMemo(() => {
    if (velocity.len() === 0) {
      return []
    }

    const vNorm = velocity.norm()
    const stepX = Math.sign(vNorm.x)
    const stepY = Math.sign(vNorm.y)
    let { x, y } = player
    const path: Path = []
    let u = player
    const total = velocity.len()
    let traveled = 0

    while (traveled !== total) {
      const cell = new Vec2(
        stepX < 0 && x % 1 === 0 ? x - 1 : Math.floor(x),
        stepY < 0 && y % 1 === 0 ? y - 1 : Math.floor(y),
      )
      invariant(cell.x % 1 === 0)
      invariant(cell.y % 1 === 0)
      const cellId = `${cell.x}.${cell.y}`
      const cellType = world.cells[cellId]?.type

      let vCurrent: Vec2 | null = vNorm

      if (cellType !== CellType.enum.Grass) {
        if (x % 1 === 0 && y % 1 === 0) {
          // TODO
          console.log('TODO')
          vCurrent = null
        } else if (x % 1 === 0) {
          // we are on the y axis, attempt to move in the y direction
          vCurrent = new Vec2(0, vCurrent.y)
        } else if (y % 1 === 0) {
          vCurrent = new Vec2(vCurrent.x, 0)
        } else {
          invariant(false)
        }
      }

      if (vCurrent === null) {
        break
      }

      const tMaxX =
        vCurrent.x === 0
          ? Number.POSITIVE_INFINITY
          : Math.abs((stepX - mod(x, stepX)) / vCurrent.x)

      const tMaxY =
        vCurrent.y === 0
          ? Number.POSITIVE_INFINITY
          : Math.abs((stepY - mod(y, stepY)) / vCurrent.y)

      let dist
      if (tMaxX < tMaxY) {
        dist = tMaxX
      } else {
        dist = tMaxY
      }

      invariant(dist > 0)

      if (traveled + dist > total) {
        dist = total - traveled
        traveled = total
      } else {
        traveled += dist
      }

      invariant(dist >= 0)
      const v = vCurrent.mul(dist)

      const a = u

      u = u.add(v)

      x += v.x
      y += v.y

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
        v: vCurrent.mul(velocity.len()),
        dist,
        cell,
      })
    }

    return path
  }, [player, velocity])
}

function move(
  position: Vec2,
  velocity: Vec2,
  path: Path,
  elapsed: number,
): Vec2 {
  if (ALLOW_MOVE) {
    for (let i = 0; i < path.length && elapsed > 0; i++) {
      const part = path.at(i)
      invariant(part)

      if (part.v.len() * elapsed < part.dist) {
        position = part.a.add(part.v.mul(elapsed))
        elapsed = 0
      } else {
        position = part.b
        elapsed -= part.v.len() * elapsed
      }
    }

    return position
  } else {
    return position
  }
}

function useMovePlayer(
  setPlayer: React.Dispatch<React.SetStateAction<Vec2>>,
  velocity: Vec2,
  path: Path,
  debug: boolean,
): void {
  const lastStep = useRef<number | null>(null)
  useEffect(() => {
    if (debug) {
      lastStep.current = null
      return
    }
    if (velocity.len() === 0) {
      lastStep.current = null
      return
    }
    if (lastStep.current === null) {
      lastStep.current = self.performance.now()
    }
    let handle: number
    function step() {
      const now = self.performance.now()
      invariant(lastStep.current !== null)
      const elapsed = (now - lastStep.current) / 1000
      lastStep.current = now
      setPlayer((prev) =>
        move(prev, velocity, path, elapsed),
      )
      handle = self.requestAnimationFrame(step)
    }
    handle = self.requestAnimationFrame(step)
    return () => {
      self.cancelAnimationFrame(handle)
    }
  }, [velocity, path, debug])
}

const INITIAL_DEBUG = (() => {
  const value = localStorage.getItem('debug')
  if (value) {
    return z.boolean().parse(JSON.parse(value))
  }
  return false
})()

function useDebug() {
  const [debug, setDebug] = useState<boolean>(INITIAL_DEBUG)
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    window.addEventListener(
      'keyup',
      (ev) => {
        if (ev.key === ' ') {
          setDebug((prev) => !prev)
        }
      },
      { signal },
    )
    return () => {
      controller.abort()
    }
  }, [])
  useEffect(() => {
    console.log('debug:', debug)
    localStorage.setItem('debug', JSON.stringify(debug))
  }, [debug])
  return debug
}

const INITIAL_PLAYER = (() => {
  const value = localStorage.getItem('player')
  if (value) {
    const { x, y } = z
      .strictObject({
        x: z.number(),
        y: z.number(),
      })
      .parse(JSON.parse(value))
    return new Vec2(x, y)
  }
  return new Vec2(0, 0)
})()

function usePlayer(): [
  Vec2,
  React.Dispatch<React.SetStateAction<Vec2>>,
] {
  const [player, setPlayer] = useState<Vec2>(INITIAL_PLAYER)
  useEffect(() => {
    localStorage.setItem('player', JSON.stringify(player))
  }, [player])
  return [player, setPlayer]
}

export function App() {
  // prettier-ignore
  const [viewport, setViewport] = useState<Vec2 | null>(null)

  const scale = viewport
    ? Math.min(viewport.x, viewport.y) / 10
    : null

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const debug = useDebug()
  const svg = useRef<SVGSVGElement>(null)
  const world = useMemo(initWorld, [])
  const [drag, setDrag] = useImmer<Drag | null>(null)
  const velocity = useVelocity(scale, drag)
  const [player, setPlayer] = usePlayer()
  const path = usePath(player, velocity, world)

  useMovePlayer(setPlayer, velocity, path, debug)

  const camera = player
  useResize(svg, setViewport)
  usePreventDefaults(svg)
  const handlers = useHandlers(setDrag)

  const viewBox = viewport
    ? `0 0 ${viewport.x} ${viewport.y}`
    : undefined

  return (
    <svg
      ref={svg}
      viewBox={viewBox}
      className={styles.app}
      data-scale={scale}
      {...handlers}
    >
      {viewport && scale && (
        <>
          <RenderGrid
            viewport={viewport}
            camera={camera}
            scale={scale}
          />
          <RenderWorld
            viewport={viewport}
            camera={camera}
            scale={scale}
            world={world}
            player={player}
            path={path}
          />
          <RenderDrag drag={drag} scale={scale} />
        </>
      )}
    </svg>
  )
}

function* iterateGridLines(viewport: Vec2): Generator<{
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
}> {
  const scale = viewport
    ? Math.min(viewport.x, viewport.y) / 10
    : 0

  const rows = Math.ceil(viewport.y / scale) + 1
  const cols = Math.ceil(viewport.x / scale) + 1

  let key = 0

  for (let row = 0; row <= rows; row++) {
    const x1 = 0
    const y1 = row * scale
    const x2 = cols * scale
    const y2 = y1
    // prettier-ignore
    yield { key: `${key++}`, x1, y1, x2, y2 }
  }

  for (let col = 0; col <= cols; col++) {
    const x1 = col * scale
    const y1 = 0
    const x2 = x1
    const y2 = rows * scale
    // prettier-ignore
    yield { key: `${key++}`, x1, y1, x2, y2 }
  }
}

function svgTranslate({ x, y }: Vec2): string {
  return `translate(${x.toFixed(2)} ${y.toFixed(2)})`
}

function svgScale({ x, y }: Vec2): string {
  return `scale(${x.toFixed(2)} ${y.toFixed(2)})`
}

function svgTransform({
  translate,
  scale,
}: {
  translate: Vec2
  scale: Vec2
}): string {
  return `${svgTranslate(translate)} ${svgScale(scale)}`
}

function* iterateCells(world: World): Generator<{
  id: string
  type: CellType
  x: number
  y: number
  color: string
}> {
  for (const [key, value] of Object.entries(world.cells)) {
    const match = key.match(/^(-?\d+)\.(-?\d+)$/)
    invariant(match?.length === 3)
    const x = parseInt(match.at(1)!)
    const y = parseInt(match.at(2)!)
    const { color, type } = value
    const id = key
    yield { id, type, x, y, color }
  }
}

function useResize(
  svg: React.RefObject<SVGSVGElement>,
  setViewport: (viewport: Vec2) => void,
): void {
  useEffect(() => {
    invariant(svg.current)
    const ro = new ResizeObserver((entries) => {
      invariant(entries.length === 1)
      const { contentRect: rect } = entries.at(0)!
      setViewport(new Vec2(rect.width, rect.height))
    })
    ro.observe(svg.current)
    return () => {
      ro.disconnect()
    }
  }, [])
}

function usePreventDefaults(
  svg: React.RefObject<SVGSVGElement>,
): void {
  useEffect(() => {
    const controller = new AbortController()
    const options: AddEventListenerOptions = {
      signal: controller.signal,
      passive: false,
    }
    function listener(ev: Event) {
      ev.preventDefault()
    }
    invariant(svg.current)
    // prettier-ignore
    {
      // disable the bounce on desktop
      svg.current.addEventListener('wheel', listener, options)

      // disable the swipe back/forward navigation on mobile
      svg.current.addEventListener('touchcancel', listener, options)
      svg.current.addEventListener('touchend', listener, options)
      svg.current.addEventListener('touchstart', listener, options)
    }
    return () => {
      controller.abort()
    }
  }, [])
}

interface RenderGridProps {
  viewport: Vec2
  camera: Vec2
  scale: number
}
function RenderGrid({
  viewport,
  camera,
  scale,
}: RenderGridProps) {
  return (
    <g
      visibility={SHOW_GRID ? undefined : 'hidden'}
      transform={svgTranslate(
        viewport
          .div(2)
          .sub(new Vec2(camera.x, camera.y * -1).mul(scale))
          .mod(scale)
          .sub(scale),
      )}
      strokeWidth={2}
      stroke="hsl(0, 0%, 10%)"
    >
      {Array.from(iterateGridLines(viewport)).map(
        ({ key, x1, y1, x2, y2 }) => (
          <line
            key={key}
            x1={x1.toFixed(2)}
            y1={y1.toFixed(2)}
            x2={x2.toFixed(2)}
            y2={y2.toFixed(2)}
          />
        ),
      )}
    </g>
  )
}

interface RenderWorldProps {
  viewport: Vec2
  camera: Vec2
  scale: number
  world: World
  player: Vec2
  path: Path
}
function RenderWorld({
  viewport,
  camera,
  scale,
  world,
  player,
  path,
}: RenderWorldProps) {
  return (
    <g
      transform={svgTransform({
        translate: viewport
          .div(2)
          .sub(
            new Vec2(camera.x, camera.y * -1).mul(scale),
          ),
        scale: new Vec2(1, -1),
      })}
    >
      {Array.from(iterateCells(world)).map(
        ({ id, x, y, color }) => (
          <rect
            key={id}
            x={x * scale}
            y={y * scale}
            width={scale}
            height={scale}
            fill={color}
          />
        ),
      )}
      <g>
        <circle
          transform={svgTranslate(player.mul(scale))}
          x={0}
          y={0}
          r={scale / 2}
          fill="blue"
        />
        {SHOW_PATH && path.length && (
          <g fill="transparent">
            {path.map(({ a, b }, i) => (
              <line
                stroke={i % 2 === 0 ? 'red' : 'cyan'}
                key={i}
                x1={a.x * scale}
                y1={a.y * scale}
                x2={b.x * scale}
                y2={b.y * scale}
              />
            ))}
            {path.map(({ cell }, i) => (
              <rect
                stroke={i % 2 === 0 ? 'red' : 'cyan'}
                key={i}
                x={cell.x * scale}
                y={cell.y * scale}
                width={scale}
                height={scale}
              />
            ))}
          </g>
        )}
        {SHOW_TARGET_CELL && path.length && (
          <g stroke="red" fill="transparent">
            <SmoothRect
              scale={scale}
              translate={path
                .at(-1)!
                .a.add(path.at(-1)!.v)
                .floor()
                .mul(scale)}
              x={0}
              y={0}
              width={scale}
              height={scale}
            />
          </g>
        )}
      </g>
    </g>
  )
}

interface SmoothRectProps {
  scale: number
  translate: Vec2
  x: number
  y: number
  width: number
  height: number
}

function useMemoizedTranslate(
  props: Pick<SmoothRectProps, 'translate'>,
): Vec2 {
  const translate = useRef<Vec2>(props.translate)
  if (!translate.current.equals(props.translate)) {
    translate.current = props.translate
  }
  return translate.current
}

function SmoothRect({
  scale,
  x,
  y,
  width,
  height,
  ...props
}: SmoothRectProps) {
  // memoize translate to simplify the effect below
  const translate = useMemoizedTranslate(props)
  const [current, setCurrent] = useState(translate)

  const lastStep = useRef<number>(self.performance.now())
  useEffect(() => {
    let handle: number
    function step() {
      const now = self.performance.now()
      const elapsed = (now - lastStep.current) / 1000
      lastStep.current = now

      setCurrent((prev) => {
        if (prev === translate) {
          return prev
        }

        const dir = translate.sub(prev)

        const speed = Math.max(
          (dir.len() * 0.25 + 1) ** 1.25 - 1,
          // need some min speed threshold so that we eventually stop
          1e-6,
        )

        const velocity = dir.norm().mul(scale * speed)
        const delta = velocity.mul(elapsed)

        if (delta.len() >= dir.len()) {
          return translate
        }

        return prev.add(delta)
      })
      handle = self.requestAnimationFrame(step)
    }
    handle = self.requestAnimationFrame(step)
    return () => {
      self.cancelAnimationFrame(handle)
    }
  }, [translate, scale])

  return (
    <rect
      transform={svgTranslate(current)}
      x={x}
      y={y}
      width={width}
      height={height}
    />
  )
}

interface RenderDragProps {
  drag: Drag | null
  scale: number
}
function RenderDrag({ drag, scale }: RenderDragProps) {
  const start = drag?.events.at(0)?.position
  let end = drag?.events.at(-1)?.position
  if (end && start && end.equals(start)) {
    end = undefined
  }

  const dir = start && end ? end.sub(start) : null
  if (dir) {
    dir.y *= -1
  }

  // multiply by -1 because atan2 measures counter-clockwise
  const angle = dir
    ? radiansToDegrees(Math.atan2(dir.y, dir.x)) * -1
    : null
  const dist = dir?.len() ?? null

  if (!start) return null
  return (
    <>
      {dir && (
        <text
          fontSize={16}
          fontFamily="system-ui"
          fill="white"
          x="100%"
          y="16"
          textAnchor="end"
        >
          {`${dir.x.toFixed(2)},${dir.y.toFixed(2)}`}
        </text>
      )}
      <g stroke="blue" fill="transparent">
        {end && (
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
          />
        )}
        <circle cx={start.x} cy={start.y} r={scale * 1.5} />
        {end && (
          <circle cx={end.x} cy={end.y} r={scale * 1.5} />
        )}
      </g>
      {dist && dist > 1 && (
        <g
          stroke="red"
          fill="transparent"
          transform={`translate(${scale} ${scale})`}
        >
          <circle cx={0} cy={0} r={scale / 2} />
          <circle
            cx={0}
            cy={0}
            transform={`rotate(${angle}) translate(${scale / 2 + (scale / 10) * 2} 0)`}
            r={scale / 10}
          />
        </g>
      )}
    </>
  )
}

function useHandlers(
  setDrag: Updater<Drag | null>,
): Required<
  Pick<
    React.DOMAttributes<Element>,
    | 'onPointerUp'
    | 'onPointerDown'
    | 'onPointerMove'
    | 'onPointerLeave'
    | 'onPointerCancel'
  >
> {
  return useMemo(() => {
    const clearDrag = (ev: React.PointerEvent) => {
      setDrag((drag) => {
        if (ev.pointerId === drag?.pointerId) {
          return null
        }
      })
    }
    return {
      onPointerDown: (ev) => {
        setDrag((prev) => {
          if (prev === null) {
            const next: Drag = {
              pointerId: ev.pointerId,
              events: [
                {
                  time: ev.timeStamp,
                  position: new Vec2(
                    ev.clientX,
                    ev.clientY,
                  ),
                },
              ],
            }
            return next
          }
          invariant(prev.pointerId !== ev.pointerId)
        })
      },

      onPointerMove: (ev) => {
        setDrag((prev) => {
          if (!prev || prev.pointerId !== ev.pointerId) {
            return
          }
          prev.events.push({
            time: ev.timeStamp,
            position: new Vec2(ev.clientX, ev.clientY),
          })
        })
      },

      onPointerUp: clearDrag,
      onPointerLeave: clearDrag,
      onPointerCancel: clearDrag,
    }
  }, [])
}
