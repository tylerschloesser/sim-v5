import { useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { Updater, useImmer } from 'use-immer'
import styles from './app.module.scss'
import { mod, radiansToDegrees } from './math.js'
import { CellType, World } from './types.js'
import { Vec2 } from './vec2.js'
import { initWorld } from './world.js'

const SHOW_GRID: boolean = true
type PointerId = number

interface Drag {
  pointerId: PointerId
  events: { time: number; position: Vec2 }[]
}

export function App() {
  // prettier-ignore
  const [viewport, setViewport] = useState<Vec2 | null>(null)
  const [drag, setDrag] = useImmer<Drag | null>(null)
  // const [camera, setCamera] = useState<Vec2>(new Vec2(0, 0))
  const [player, setPlayer] = useState<Vec2>(new Vec2(0, 0))

  const camera = player

  // prettier-ignore
  const velocity  = useRef<Vec2>(new Vec2(0, 0))

  useEffect(() => {
    const start = drag?.events.at(0)?.position
    let end = drag?.events.at(-1)?.position
    if (end === start) {
      end = undefined
    }
    const dir =
      start && end ? end.sub(start) : new Vec2(0, 0)
    velocity.current.x = dir.x
    velocity.current.y = dir.y
  }, [drag])

  useEffect(() => {
    let handle: number
    let last = self.performance.now()
    function step() {
      const now = self.performance.now()
      const elapsed = (now - last) / 1000
      last = now
      const speed = velocity.current.len()
      if (speed > 0) {
        setPlayer((prev) =>
          prev.add(velocity.current.mul(elapsed)),
        )
      }
      handle = self.requestAnimationFrame(step)
    }
    handle = self.requestAnimationFrame(step)
    return () => {
      self.cancelAnimationFrame(handle)
    }
  }, [])

  const world = useMemo(initWorld, [])
  const svg = useRef<SVGSVGElement>(null)
  useResize(svg, setViewport)
  usePreventDefaults(svg)
  const handlers = useHandlers(setDrag)

  const scale = viewport
    ? Math.min(viewport.x, viewport.y) / 10
    : 0

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
      {viewport && (
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

function translate(x: number, y: number): string {
  return `translate(${x.toFixed(2)} ${y.toFixed(2)})`
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
      transform={translate(
        mod(viewport.x / 2 - camera.x * scale, scale) -
          scale,
        mod(viewport.y / 2 - camera.y * scale, scale) -
          scale,
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
}
function RenderWorld({
  viewport,
  camera,
  scale,
  world,
  player,
}: RenderWorldProps) {
  return (
    <g
      transform={translate(
        viewport.x / 2 - camera.x * scale,
        viewport.y / 2 - camera.y * scale,
      )}
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
      <circle
        transform={translate(
          player.x * scale,
          player.y * scale,
        )}
        x={0}
        y={0}
        r={scale / 2}
        fill="blue"
      />
    </g>
  )
}

interface RenderPointerProps {
  drag: Drag | null
  scale: number
}
function RenderDrag({ drag, scale }: RenderPointerProps) {
  const start = drag?.events.at(0)?.position
  let end = drag?.events.at(-1)?.position
  if (end === start) {
    end = undefined
  }

  const dir = start && end ? end.sub(start) : null
  const angle = dir
    ? radiansToDegrees(Math.atan2(dir.y, dir.x))
    : null
  const dist = dir?.len() ?? null

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
      {dist && dist > 1 && (
        <g
          stroke="red"
          fill="transparent"
          transform="translate(100 100)"
        >
          <circle cx={0} cy={0} r={25} />
          <circle
            cx={0}
            cy={0}
            transform={`rotate(${angle}) translate(25 0)`}
            r={5}
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
