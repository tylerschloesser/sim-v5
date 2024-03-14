import { useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import { Updater, useImmer } from 'use-immer'
import styles from './app.module.scss'
import { mod } from './math.js'
import { CellType, World } from './types.js'
import { Vec2 } from './vec2.js'
import { initWorld } from './world.js'

const SHOW_GRID: boolean = true
type PointerId = number

interface Drag {
  pointerId: PointerId
  events: { time: number; x: number; y: number }[]
}

export function App() {
  // prettier-ignore
  const [viewport, setViewport] = useState<Vec2 | null>(null)
  const [drag, setDrag] = useImmer<Drag | null>(null)
  const [camera, setCamera] = useState<Vec2>(new Vec2(0, 0))
  const [player, setPlayer] = useState<Vec2>(new Vec2(0, 0))

  const world = useMemo(initWorld, [])
  const svg = useRef<SVGSVGElement>(null)
  useResize(svg, setViewport)
  usePreventDefaults(svg)
  const handlers = useHandlers(setDrag)

  const size = viewport
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
      data-size={size}
      {...handlers}
    >
      {viewport && (
        <>
          <RenderGrid
            viewport={viewport}
            camera={camera}
            size={size}
          />
          <RenderWorld
            viewport={viewport}
            camera={camera}
            size={size}
            world={world}
            player={player}
          />
          <RenderDrag drag={drag} size={size} />
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
  const size = viewport
    ? Math.min(viewport.x, viewport.y) / 10
    : 0

  const rows = Math.ceil(viewport.y / size) + 1
  const cols = Math.ceil(viewport.x / size) + 1

  let key = 0

  for (let row = 0; row <= rows; row++) {
    const x1 = 0
    const y1 = row * size
    const x2 = cols * size
    const y2 = y1
    // prettier-ignore
    yield { key: `${key++}`, x1, y1, x2, y2 }
  }

  for (let col = 0; col <= cols; col++) {
    const x1 = col * size
    const y1 = 0
    const x2 = x1
    const y2 = rows * size
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
  size: number
}
function RenderGrid({
  viewport,
  camera,
  size,
}: RenderGridProps) {
  return (
    <g
      visibility={SHOW_GRID ? undefined : 'hidden'}
      transform={translate(
        mod(viewport.x / 2 - camera.x * size, size) - size,
        mod(viewport.y / 2 - camera.y * size, size) - size,
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
  size: number
  world: World
  player: Vec2
}
function RenderWorld({
  viewport,
  camera,
  size,
  world,
  player,
}: RenderWorldProps) {
  return (
    <g
      transform={translate(
        viewport.x / 2 - camera.x * size,
        viewport.y / 2 - camera.y * size,
      )}
    >
      {Array.from(iterateCells(world)).map(
        ({ id, x, y, color }) => (
          <rect
            key={id}
            x={x * size}
            y={y * size}
            width={size}
            height={size}
            fill={color}
          />
        ),
      )}
      <rect
        transform={translate(
          player.x * size,
          player.y * size,
        )}
        x={-0.5 * size}
        y={-0.5 * size}
        width={size}
        height={size}
        fill="blue"
      />
    </g>
  )
}

interface RenderPointerProps {
  drag: Drag | null
  size: number
}
function RenderDrag({ drag, size }: RenderPointerProps) {
  const start = drag?.events.at(0)
  return (
    <g
      visibility={start ? undefined : 'hidden'}
      transform={
        start ? translate(start.x, start.y) : undefined
      }
    >
      <circle
        cx="0"
        cy="0"
        r={size * 1.5}
        fill="transparent"
        stroke="blue"
      />
    </g>
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
    const clearDrag = () => {
      setDrag(null)
    }
    return {
      onPointerDown: (ev) => {
        setDrag((prev) => {
          if (prev === null) {
            return {
              pointerId: ev.pointerId,
              events: [
                {
                  time: ev.timeStamp,
                  x: ev.clientX,
                  y: ev.clientY,
                },
              ],
            }
          }

          if (prev.pointerId !== ev.pointerId) {
            return
          }

          prev.events.push({
            time: ev.timeStamp,
            x: ev.clientX,
            y: ev.clientY,
          })
        })
      },

      onPointerUp: clearDrag,
      onPointerLeave: clearDrag,
      onPointerCancel: clearDrag,

      onPointerMove: (ev) => {},
    }
  }, [])
}
