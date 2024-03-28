import { useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { Updater, useImmer } from 'use-immer'
import * as z from 'zod'
import styles from './app.module.scss'
import {
  ALLOW_MOVE,
  SHOW_GRID,
  SHOW_PATH,
  SHOW_TARGET_CELL,
} from './const.js'
import { radiansToDegrees } from './math.js'
import {
  CellType,
  Drag,
  Path,
  Player,
  World,
} from './types.js'
import { usePath } from './use-path.js'
import { useVelocity } from './use-velocity.js'
import { Vec2 } from './vec2.js'
import { initWorld } from './world.js'

function move(
  player: Player,
  path: Path,
  elapsed: number,
): Player {
  if (!ALLOW_MOVE || path.length === 0 || elapsed === 0) {
    return player
  }

  invariant(elapsed > 0)

  let position = new Vec2(player.position)
  let cellId = player.cellId

  for (let i = 0; i < path.length && elapsed > 0; i++) {
    const part = path.at(i)
    invariant(part)

    if (elapsed < part.t) {
      position = part.a.add(part.v.mul(elapsed))
      elapsed = 0
    } else {
      position = part.b
      elapsed -= part.t
    }

    cellId = `${part.point.x}.${part.point.y}`
  }

  return { position, cellId }
}

function useMovePlayer(
  setPlayer: React.Dispatch<React.SetStateAction<Player>>,
  path: Path,
  debug: boolean,
): void {
  const lastStep = useRef<number | null>(null)
  useEffect(() => {
    if (debug) {
      lastStep.current = null
      return
    }
    if (path.length === 0) {
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
      setPlayer((prev) => move(prev, path, elapsed))
      handle = self.requestAnimationFrame(step)
    }
    handle = self.requestAnimationFrame(step)
    return () => {
      self.cancelAnimationFrame(handle)
    }
  }, [path, debug])
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
    const {
      position: { x, y },
      cellId,
    } = z
      .strictObject({
        position: z.strictObject({
          x: z.number(),
          y: z.number(),
        }),
        cellId: z.string(),
      })
      .parse(JSON.parse(value))
    return {
      position: new Vec2(x, y),
      cellId,
    }
  }
  return {
    position: new Vec2(0, 0),
    cellId: '0.0',
  }
})()

function usePlayer(): [
  Player,
  React.Dispatch<React.SetStateAction<Player>>,
] {
  const [player, setPlayer] =
    useState<Player>(INITIAL_PLAYER)
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

  useMovePlayer(setPlayer, path, debug)

  const camera = player.position
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
          <RenderVelocity
            velocity={velocity}
            scale={scale}
          />
          <RenderAction
            viewport={viewport}
            scale={scale}
            player={player}
            world={world}
          />
        </>
      )}
    </svg>
  )
}

interface RenderActionProps {
  viewport: Vec2
  scale: number
  player: Player
  world: World
}

function RenderAction({
  viewport,
  scale,
  player,
  world,
}: RenderActionProps) {
  const r = scale * 1.5

  const { cellId } = player
  const cell = world.cells[cellId]
  invariant(cell)

  const disabled = cell.type !== CellType.enum.Stone

  const fill = `hsla(0, 100%, 50%, ${disabled ? 0.5 : 1})`

  const onPointerUp = disabled
    ? undefined
    : () => {
        console.log('todo')
      }

  return (
    <circle
      onPointerUp={onPointerUp}
      onPointerDown={(ev) => {
        ev.stopPropagation()
      }}
      cx={viewport.x / 2}
      cy={viewport.y - r * 2}
      r={r}
      fill={fill}
    />
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
  player: Player
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
          transform={svgTranslate(
            player.position.mul(scale),
          )}
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
            {path.map(({ point }, i) => (
              <rect
                stroke={i % 2 === 0 ? 'red' : 'cyan'}
                key={i}
                x={point.x * scale + 1}
                y={point.y * scale + 1}
                width={scale - 2}
                height={scale - 2}
              />
            ))}
          </g>
        )}
        {SHOW_TARGET_CELL && path.length && (
          <g stroke="red" fill="transparent">
            <SmoothRect
              scale={scale}
              translate={path.at(-1)!.point.mul(scale)}
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

interface RenderVelocityProps {
  velocity: Vec2
  scale: number
}
function RenderVelocity({
  velocity,
  scale,
}: RenderVelocityProps) {
  if (velocity.len() === 0) {
    return null
  }

  const { x: vx, y: vy } = velocity
  // multiply by -1 because atan2 measures counter-clockwise
  const angle = radiansToDegrees(Math.atan2(vy, vx)) * -1

  return (
    <>
      <text
        fontSize={16}
        fontFamily="system-ui"
        fill="white"
        x="100%"
        y="16"
        textAnchor="end"
      >
        {`speed: ${velocity.len().toFixed(2)}`}
      </text>
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
    </>
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
  if (!start) return null
  return (
    <>
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
