import { useEffect, useRef } from 'react'
import invariant from 'tiny-invariant'
import styles from './app.module.scss'

export function App() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    invariant(ref.current)
    init(ref.current)
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

function init(svg: SVGSVGElement): void {
  console.log(svg)
}
