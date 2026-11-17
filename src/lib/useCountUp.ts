import { useEffect, useRef, useState } from 'react'

/** Animates a number toward its new value (skipped when the user prefers reduced motion). */
export function useCountUp(target: number, ms = 600): number {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || from.current === target) {
      from.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    const begin = from.current
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(begin + (target - begin) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = target
    }
  }, [target, ms])
  return value
}

/** Starts from 0 the first time it renders, then animates between values. */
export function useCountUpFromZero(target: number, ms = 800): number {
  const [seen, setSeen] = useState(false)
  useEffect(() => setSeen(true), [])
  return useCountUp(seen ? target : 0, ms)
}
