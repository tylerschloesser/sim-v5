import { useEffect, useRef } from 'react'
import { BehaviorSubject } from 'rxjs'
import invariant from 'tiny-invariant'
import styles from './app.module.scss'

export function App() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    invariant(ref.current)

    const viewport$ = new BehaviorSubject(
      ref.current.getBoundingClientRect(),
    )

    const viewportSub = viewport$.subscribe((viewport) => {
      if (ref.current) {
        ref.current.setAttribute(
          'viewBox',
          `0 0 ${viewport.width} ${viewport.height}`,
        )
      }
    })

    const ro = new ResizeObserver((entries) => {
      invariant(entries.length === 1)
      const entry = entries.at(0)!
      viewport$.next(entry.contentRect)
    })
    ro.observe(ref.current)

    init({
      svg: ref.current,
      signal: controller.signal,
    })
    return () => {
      controller.abort()
      ro.disconnect()
      viewportSub.unsubscribe()
    }
  }, [])

  return (
    <svg ref={ref} className={styles.app}>
      <circle cx="50" cy="50" r="10" fill="blue"></circle>
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
