import { useEffect, useRef } from 'react'
import invariant from 'tiny-invariant'
import styles from './app.module.scss'

export function App() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    invariant(ref.current)
    init({
      svg: ref.current,
      signal: controller.signal,
    })
    return () => {
      controller.abort()
    }
  }, [])

  return (
    <svg
      ref={ref}
      className={styles.app}
      viewBox="0 0 100 100"
    >
      <circle cx="50" cy="50" r="10" fill="blue"></circle>
    </svg>
  )
}

interface InitArgs {
  svg: SVGSVGElement
  signal: AbortSignal
}

function init({ svg, signal }: InitArgs): void {
  console.log(svg)

  svg.addEventListener(
    'wheel',
    (ev) => {
      ev.preventDefault()
    },
    { passive: false, signal },
  )
}
