import { useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import styles from './app.module.scss'
import { mod } from './math.js'
import { World } from './types.js'
import { Vec2 } from './vec2.js'
import { initWorld } from './world.js'

type PointerId = number
const pointerEventCache = new Map<PointerId, PointerEvent>()

export function App() {
  const ref = useRef<SVGSVGElement>(null)

  // prettier-ignore
  const [viewport, setViewport] = useState<Vec2 | null>(null)
  const [pointer, setPointer] = useState<Vec2 | null>(null)
  const [camera, setCamera] = useState<Vec2>(new Vec2(0, 0))

  const world = useMemo(initWorld, [])

  useEffect(() => {
    const controller = new AbortController()
    invariant(ref.current)

    const ro = new ResizeObserver((entries) => {
      invariant(entries.length === 1)
      const { contentRect: rect } = entries.at(0)!
      setViewport(new Vec2(rect.width, rect.height))
    })
    ro.observe(ref.current)

    init({
      svg: ref.current,
      signal: controller.signal,
      setPointer,
      setCamera,
    })
    return () => {
      controller.abort()
      ro.disconnect()
    }
  }, [])

  const size = viewport
    ? Math.min(viewport.x, viewport.y) / 10
    : 0

  return (
    <svg
      viewBox={
        viewport
          ? `0 0 ${viewport.x} ${viewport.y}`
          : undefined
      }
      ref={ref}
      className={styles.app}
      data-size={size}
    >
      {viewport && (
        <>
          <g
            transform={translate(
              mod(viewport.x / 2 - camera.x, size) - size,
              mod(viewport.y / 2 - camera.y, size) - size,
            )}
            strokeWidth={2}
            stroke="hsl(0, 0%, 10%)"
          >
            {mapGridLines(
              viewport,
              (key, x1, y1, x2, y2) => (
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
          <g
            transform={translate(
              viewport.x / 2 - camera.x,
              viewport.y / 2 - camera.y,
            )}
          >
            {mapCells(world, ({ id, x, y, color }) => (
              <rect
                key={id}
                x={x * size}
                y={y * size}
                width={size}
                height={size}
                fill={color}
              />
            ))}
            <circle
              transform={translate(camera.x, camera.y)}
              cx="0"
              cy="0"
              r={size / 2}
              fill="blue"
            />
          </g>
          {pointer && (
            <circle
              transform={translate(pointer.x, pointer.y)}
              cx="0"
              cy="0"
              r={size * 1.5}
              fill="transparent"
              stroke="blue"
            />
          )}
        </>
      )}
    </svg>
  )
}

function mapGridLines(
  viewport: Vec2,
  cb: (
    key: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => JSX.Element,
): Array<JSX.Element> {
  const size = viewport
    ? Math.min(viewport.x, viewport.y) / 10
    : 0

  const rows = Math.ceil(viewport.y / size) + 1
  const cols = Math.ceil(viewport.x / size) + 1

  let key = 0

  const lines = new Array<JSX.Element>()

  for (let row = 0; row <= rows; row++) {
    const x1 = 0
    const y1 = row * size
    const x2 = cols * size
    const y2 = y1
    lines.push(cb(`${key++}`, x1, y1, x2, y2))
  }

  for (let col = 0; col <= cols; col++) {
    const x1 = col * size
    const y1 = 0
    const x2 = x1
    const y2 = rows * size
    lines.push(cb(`${key++}`, x1, y1, x2, y2))
  }

  return lines
}

interface InitArgs {
  svg: SVGSVGElement
  signal: AbortSignal
  setPointer(pointer: Vec2 | null): void
  setCamera(cb: (prev: Vec2) => Vec2): void
}

function init({
  svg,
  signal,
  setPointer,
  setCamera,
}: InitArgs): void {
  // prettier-ignore
  {
    svg.addEventListener('wheel', (ev) => { ev.preventDefault() }, { passive: false, signal })
  }

  let friction = 0
  let velocity: Vec2 = new Vec2(0, 0)

  let handle: number
  let last = self.performance.now()
  function callback() {
    const now = self.performance.now()
    const elapsed = (now - last) / 1000
    last = now
    const speed = velocity.len()
    if (speed > 0 && speed < Number.EPSILON) {
      velocity.x = 0
      velocity.y = 0
      friction = 0
    } else if (speed > 0) {
      if (friction) {
        invariant(friction > 0)
        invariant(friction <= 1)
        velocity = velocity.sub(velocity.mul(1 - friction))
      }

      setCamera((camera) =>
        camera.add(velocity.mul(elapsed)),
      )
    }
    handle = self.requestAnimationFrame(callback)
  }
  handle = self.requestAnimationFrame(callback)
  signal.addEventListener('abort', () => {
    self.cancelAnimationFrame(handle)
  })

  svg.addEventListener(
    'pointermove',
    (ev) => {
      setPointer(new Vec2(ev.offsetX, ev.offsetY))
      const prev = pointerEventCache.get(ev.pointerId)
      pointerEventCache.set(ev.pointerId, ev)

      if (prev?.buttons && ev.buttons) {
        const dx = ev.offsetX - prev.offsetX
        const dy = ev.offsetY - prev.offsetY
        const dt = ev.timeStamp - prev.timeStamp

        friction = 0
        const scale = 200
        velocity.x =
          ((Math.sign(dx) * Math.abs(dx) ** 1.5) / dt) *
          scale
        velocity.y =
          ((Math.sign(dy) * Math.abs(dy) ** 1.5) / dt) *
          scale
      }
    },
    { signal },
  )

  svg.addEventListener(
    'pointerup',
    () => {
      friction = 0.8
      setPointer(null)
    },
    { signal },
  )

  // prettier-ignore
  {
    const options: AddEventListenerOptions = { signal, passive: false }
    svg.addEventListener('touchcancel', (ev) => { ev.preventDefault() }, options)
    svg.addEventListener('touchend', (ev) => { ev.preventDefault() }, options)
    svg.addEventListener('touchstart', (ev) => { ev.preventDefault() }, options)
  }
}

function translate(x: number, y: number): string {
  return `translate(${x.toFixed(2)} ${y.toFixed(2)})`
}

function mapCells(
  world: World,
  cb: (args: {
    id: string
    x: number
    y: number
    color: string
  }) => JSX.Element,
): Array<JSX.Element> {
  const result = new Array<JSX.Element>()

  for (const [key, value] of Object.entries(world.cells)) {
    const match = key.match(/^(-?\d+)\.(-?\d+)$/)
    invariant(match?.length === 3)
    const x = parseInt(match.at(1)!)
    const y = parseInt(match.at(2)!)
    const color = value
    const id = key
    result.push(cb({ id, x, y, color }))
  }

  return result
}
