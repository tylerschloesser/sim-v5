import { useEffect, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import styles from './app.module.scss'

interface Vec2 {
  x: number
  y: number
}

export function App() {
  const ref = useRef<SVGSVGElement>(null)

  const [viewport, setViewport] = useState<Vec2 | null>(
    null,
  )

  const [pointer, setPointer] = useState<Vec2 | null>(null)

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
    >
      {viewport && (
        <>
          <g
            transform={`translate(${viewport.x / 2} ${viewport.y / 2})`}
          >
            <circle
              cx="0"
              cy="0"
              r={size / 2}
              fill="blue"
            />
          </g>
          {pointer && (
            <circle
              cx={pointer.x}
              cy={pointer.y}
              r={size * 2}
              fill="transparent"
              stroke="blue"
            />
          )}
        </>
      )}
    </svg>
  )
}

interface InitArgs {
  svg: SVGSVGElement
  signal: AbortSignal
  setPointer(pointer: Vec2 | null): void
}

function init({ svg, signal, setPointer }: InitArgs): void {
  // prettier-ignore
  {
    svg.addEventListener('wheel', (ev) => { ev.preventDefault() }, { passive: false, signal })
  }

  svg.addEventListener(
    'pointermove',
    (ev) => {
      setPointer({ x: ev.offsetX, y: ev.offsetY })
    },
    { signal },
  )

  svg.addEventListener(
    'pointerleave',
    () => {
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
