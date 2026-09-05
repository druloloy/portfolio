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

    // ScrollTrigger's refresh only fires on load and on window resize, and
    // Lenis' own ResizeObserver is attached to `document.documentElement` —
    // which `app.scss` pins to `height: 100%`. That box is therefore always
    // exactly one viewport tall and its observer can never fire, so Lenis keeps
    // whichever scroll limit it happened to measure at init. Anything that
    // grows the page afterwards (images decoding, webfonts swapping, late
    // hydration) is invisible to it, and it clamps scrolling short of the
    // bottom: the page simply stops partway down with content still below.
    //
    // The body's element children carry the real content height, so observing
    // them gives Lenis the signal it is missing. This is why the symptom looked
    // like a projects-section bug — that section is where most of the late
    // height arrives — and why it never reproduced under programmatic
    // scrolling, which bypasses Lenis' limit entirely.
    let frame = 0
    let lastHeight = document.documentElement.scrollHeight

    const remeasure = (): void => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const height = document.documentElement.scrollHeight
        // Bail when nothing actually moved, so a refresh that itself nudges
        // layout cannot feed back into this observer forever.
        if (height === lastHeight) return
        lastHeight = height
        lenis.resize()
        ScrollTrigger.refresh()
      })
    }

    const contentObserver = new ResizeObserver(remeasure)
    Array.from(document.body.children).forEach(child => {
      if (child instanceof HTMLElement) contentObserver.observe(child)
    })

    const onTick = (time: number): void => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    // Measure once after mount, so any layout that settled during hydration is
    // accounted for before the visitor scrolls.
    ScrollTrigger.refresh()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      contentObserver.disconnect()
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
