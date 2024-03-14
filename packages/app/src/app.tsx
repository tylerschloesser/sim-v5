import {
  Bodies,
  Body,
  Composite,
  Engine,
  Events,
  Runner,
} from 'matter-js'
import { useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import styles from './app.module.scss'
import { mod } from './math.js'
import { CellType, World } from './types.js'
import { Vec2 } from './vec2.js'
import { initWorld } from './world.js'

const SHOW_GRID: boolean = true

type PointerId = number

export function App() {
  // prettier-ignore
  const [viewport, setViewport] = useState<Vec2 | null>(null)
  const [pointer, setPointer] = useState<Vec2 | null>(null)
  const [camera, setCamera] = useState<Vec2>(new Vec2(0, 0))
  const [player, setPlayer] = useState<Vec2>(new Vec2(0, 0))

  const pointerEventCache = useMemo(
    () => new Map<PointerId, React.PointerEvent>(),
    [],
  )

  const playerBody = useMemo(
    () =>
      Bodies.circle(0, 0, 0.5, {
        frictionAir: 0.1,
        slop: 0,
        friction: 0,
      }),
    [],
  )

  const world = useMemo(initWorld, [])

  const svg = useRef<SVGSVGElement>(null)

  usePhysics(world, playerBody, setPlayer, setCamera)

  useResize(svg, setViewport)
  usePreventDefaults(svg)

  const size = viewport
    ? Math.min(viewport.x, viewport.y) / 10
    : 0

  return (
    <svg
      ref={svg}
      viewBox={
        viewport
          ? `0 0 ${viewport.x} ${viewport.y}`
          : undefined
      }
      className={styles.app}
      data-size={size}
      onPointerMove={(ev) => {
        setPointer(new Vec2(ev.clientX, ev.clientY))
        const prev = pointerEventCache.get(ev.pointerId)
        pointerEventCache.set(ev.pointerId, ev)

        if (prev?.buttons && ev.buttons) {
          const dx = ev.clientX - prev.clientX
          const dy = ev.clientY - prev.clientY
          const dt = ev.timeStamp - prev.timeStamp

          const d = new Vec2(dx, dy)
          const speed = d.len()

          const scale = ((speed + 1) ** 1 - 1) * (1 / 100)

          const vx = (dx / dt) * scale
          const vy = (dy / dt) * scale
          Body.setVelocity(playerBody, new Vec2(vx, vy))
        }
      }}
      onPointerUp={() => {
        setPointer(null)
      }}
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
          <RenderPointer pointer={pointer} size={size} />
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

function usePhysics(
  world: World,
  playerBody: Body,
  setPlayer: (cb: (prev: Vec2) => Vec2) => void,
  setCamera: (cb: (prev: Vec2) => Vec2) => void,
): void {
  const deps: React.DependencyList = [world, playerBody]
  useEffect(() => {
    const engine = Engine.create({
      gravity: new Vec2(0, 0),
    })

    Composite.add(engine.world, [
      ...Array.from(iterateCells(world))
        .filter(({ type }) => type === CellType.enum.Stone)
        .map(({ x, y }) =>
          Bodies.rectangle(x + 0.5, y + 0.5, 1, 1, {
            isStatic: true,
            slop: 0,
            friction: 0,
          }),
        ),
      playerBody,
    ])

    Events.on(engine, 'afterUpdate', () => {
      setPlayer((prev) => {
        if (
          prev.x !== playerBody.position.x ||
          prev.y !== playerBody.position.y
        ) {
          return new Vec2(
            playerBody.position.x,
            playerBody.position.y,
          )
        }
        return prev
      })
      setCamera((prev) => {
        if (
          prev.x !== playerBody.position.x ||
          prev.y !== playerBody.position.y
        ) {
          return new Vec2(
            playerBody.position.x,
            playerBody.position.y,
          )
        }
        return prev
      })
    })

    Events.on(engine, 'collisionStart', () => {
      console.log('collision')
    })

    const runner = Runner.create()
    Runner.start(runner, engine)

    return () => {
      Runner.stop(runner)
    }
  }, deps)
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
      <circle
        transform={translate(
          player.x * size,
          player.y * size,
        )}
        cx="0"
        cy="0"
        r={size / 2}
        fill="blue"
      />
    </g>
  )
}

interface RenderPointerProps {
  pointer: Vec2
  size: number
}
function RenderPointer({
  pointer,
  size,
}: RenderPointerProps) {
  return (
    <g
      visibility={pointer ? undefined : 'hidden'}
      transform={
        pointer
          ? translate(pointer.x, pointer.y)
          : undefined
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
