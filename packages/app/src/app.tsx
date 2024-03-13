import { useEffect, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import styles from './app.module.scss'
import { mod } from './math.js'
import { Vec2 } from './vec2.js'

type PointerId = number
const pointerEventCache = new Map<PointerId, PointerEvent>()

export function App() {
  const ref = useRef<SVGSVGElement>(null)

  const [viewport, setViewport] = useState<Vec2 | null>(
    null,
  )

  const [pointer, setPointer] = useState<Vec2 | null>(null)

  const [camera, setCamera] = useState<Vec2>(new Vec2(0, 0))

  useEffect(() => {
    const controller = new AbortController()
    invariant(ref.current)

    const ro = new ResizeObserver((entries) => {
      invariant(entries.length === 1)
      const { contentRect: rect } = entries.at(0)!
      setViewport({ x: rect.width, y: rect.height })
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

  const acceleration: Vec2 = new Vec2(0, 0)
  const velocity: Vec2 = new Vec2(0, 0)

  let handle: number
  let last = self.performance.now()
  function callback() {
    const now = self.performance.now()
    const elapsed = (now - last) / 1000
    last = now
    if (velocity.x !== 0 || velocity.y !== 0) {
      setCamera((camera) => ({
        x: camera.x + velocity.x * elapsed,
        y: camera.y + velocity.y * elapsed,
      }))
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
      setPointer({ x: ev.offsetX, y: ev.offsetY })

      const prev = pointerEventCache.get(ev.pointerId)
      pointerEventCache.set(ev.pointerId, ev)

      if (prev?.buttons && ev.buttons) {
        const dx = ev.offsetX - prev.offsetX
        const dy = ev.offsetY - prev.offsetY
        const scale = 10
        velocity.x =
          Math.sign(dx) * Math.abs(dx) ** 1.5 * scale
        velocity.y =
          Math.sign(dy) * Math.abs(dy) ** 1.5 * scale
      }
    },
    { signal },
  )

  svg.addEventListener(
    'pointerleave',
    () => {
      velocity.x = velocity.y = 0
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
