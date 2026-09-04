'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import Lenis from 'lenis'

import { prefersReducedMotion } from '../../_utilities/prefersReducedMotion'

type SmoothScrollContextValue = {
  scrollTo: (target: number | string) => void
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  scrollTo: target => {
    if (typeof window === 'undefined') return
    if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' })
  },
})

export const useSmoothScroll = (): SmoothScrollContextValue => useContext(SmoothScrollContext)

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lenisRef = useRef<Lenis | null>(null)
  const [, setReady] = useState(false)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    // Reduced motion: no virtual scroll at all. The visitor keeps native
    // scrolling, and ScrollTrigger still works against it for anything that
    // chooses to run. Never take over scroll for someone who asked for less
    // motion.
    if (prefersReducedMotion()) {
      ScrollTrigger.refresh()
      return undefined
    }

    const lenis = new Lenis({
      // Follow in-page anchors (#work_exp, #projects, #stacks) through Lenis
      // rather than letting the browser jump.
      anchors: true,
    })
    lenisRef.current = lenis
    setReady(true)

    // Canonical Lenis <-> ScrollTrigger wiring: Lenis reports scroll to
    // ScrollTrigger, and GSAP's ticker drives Lenis' rAF loop so the two never
    // run on competing frames.
    lenis.on('scroll', ScrollTrigger.update)

    // ScrollTrigger pins inject spacer elements that grow the document long
    // after Lenis measured it. Lenis caches its scroll limit, so without this
    // it keeps the stale one and simply refuses to scroll past it — the page
    // appears to stop partway down. This is the third required piece of the
    // Lenis/ScrollTrigger integration, alongside the scroll listener above and
    // the ticker below.
    const onRefresh = (): void => {
      lenis.resize()
    }

    ScrollTrigger.addEventListener('refresh', onRefresh)

    const onTick = (time: number): void => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    // Measure once after mount, so any layout that settled during hydration is
    // accounted for before the visitor scrolls.
    ScrollTrigger.refresh()

    return () => {
      ScrollTrigger.removeEventListener('refresh', onRefresh)
      gsap.ticker.remove(onTick)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  const scrollTo = React.useCallback((target: number | string): void => {
    const lenis = lenisRef.current
    if (lenis) {
      lenis.scrollTo(target)
      return
    }
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }, [])

  return (
    <SmoothScrollContext.Provider value={{ scrollTo }}>{children}</SmoothScrollContext.Provider>
  )
}
