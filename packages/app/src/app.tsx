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
    })
    return () => {
      controller.abort()
      ro.disconnect()
    }
  }, [])

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
        <g
          transform={`translate(${viewport.x / 2} ${viewport.y / 2})`}
        >
          <circle cx="0" cy="0" r="10" fill="blue"></circle>
        </g>
      )}
    </svg>
  )
}

interface InitArgs {
  svg: SVGSVGElement
  signal: AbortSignal
}

function init({ svg, signal }: InitArgs): void {
  // prettier-ignore
  {
    svg.addEventListener('wheel', (ev) => { ev.preventDefault() }, { passive: false, signal })
  }

  // prettier-ignore
  {
    const options: AddEventListenerOptions = { signal, passive: false }
    svg.addEventListener('touchcancel', (ev) => { ev.preventDefault() }, options)
    svg.addEventListener('touchend', (ev) => { ev.preventDefault() }, options)
    svg.addEventListener('touchstart', (ev) => { ev.preventDefault() }, options)
  }
}
