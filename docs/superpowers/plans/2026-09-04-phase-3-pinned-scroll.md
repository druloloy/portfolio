# Phase 3 — Pinned scroll with GSAP + Lenis

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Pin the projects section while its cards sweep across, then release it and let the
stacks section slide up over it like a sheet of paper.

**Origin:** Site-owner feedback, 2026-09-04:

> "it looks stupid, maybe we can look at how parallax is doing. we maybe should freeze the
> Coffee-driven Projects section, the projects will still scroll, the text and background
> will follow the scroll down until the project carousel is finished or at the end of the
> list then the section below will cover the section like a paper moved from bottom to
> view … maybe we can explore Lenis library and GSAP"

## Decisions taken (owner, 2026-09-04)

| Decision | Choice |
|---|---|
| Libraries | **GSAP + ScrollTrigger + Lenis.** |
| Reduced motion | **No pin.** Plain scrollable row, page scrolls normally, Lenis not initialised. |
| Scope | **Projects section only** for now. |

## Note on GSAP's return

`gsap` was removed in Phase 2 Task 2 because nothing imported it — it was registering
`ScrollTrigger` in the root layout and driving zero animations. Removing genuinely dead
weight was correct then; adding it back now that there is a real use is also correct. The
bundle cost is only justified when something uses it.

## Measured facts this plan rests on

Taken from the running site at 1440x900:

- Track is **1248px** (3 cards x 400px + 2 x 24px gaps) against a **1409px** window.
  **The cards do not overflow.** A classic pinned horizontal scroller has nothing to
  scroll here, so the pin drives the existing right-to-left *sweep* instead, with the pin
  duration set to the sweep distance.
- `<main>` block order: hero (docTop 0) → PROVEN TRACK RECORD (900) → COFFEE-DRIVEN
  PROJECTS (2020) → STACKS / MASTERING MODERN WEB DEVELOPMENT (3080 after the -192px card
  overlap).
- `.collectionArchive` is the clipping window; `.grid` is the track. The transform must be
  applied to `.grid`, never to `.collectionArchive` — transforming the window drags it out
  of its flex column and over the heading. This was a real defect earlier in the project.

## Integration hazards — all four must be handled

1. **`scroll-behavior: smooth` at `_css/app.scss:47`** conflicts with Lenis; it must become
   `auto`. (Line 136 already forces `auto` under reduced motion — leave that alone.)
2. **`ScrollUp` (`_components/ScrollUp/index.tsx:26`) calls
   `window.scrollTo({ top: 0, behavior: 'smooth' })`**, which bypasses Lenis. It must route
   through Lenis when Lenis is active, and fall back to the native call when it is not.
3. **AOS is live in 7 files** (`ArchiveBlock`, `StacksParade`, `CollectionArchive`,
   `CollectionStacksParade`, `RichText/serialize`, `Revamp`, and the AOS provider itself).
   AOS listens for scroll events. If Lenis stops native scroll events firing, **every
   reveal animation on the site dies silently.** This is the single biggest risk in this
   plan and must be explicitly verified, not assumed.
4. **In-page anchors.** The header nav links to `#work_exp`, `#projects`, `#stacks`. Lenis
   must handle those or they stop working.

## Global Constraints

- **Do not touch anything under `src/payload/`** or `src/server.ts`.
- **Every task ends green:** `yarn test` (14, must stay 14 and untouched),
  `npx tsc --noEmit -p tsconfig.json`, `yarn lint` — all exit 0.
- Conventional commits, **no attribution trailer**.
- Windows: `yarn` only resolves in PowerShell; never read an exit code after a pipe.
- Dev server is **`yarn dev:local`**, never `yarn dev`.
- Brand values stay frozen: no colour, type, border or shadow changes.

---

## Task 27: Install GSAP + Lenis, add the smooth-scroll provider

**Files:**
- Modify: `package.json`
- Create: `src/app/_providers/SmoothScroll/index.tsx`
- Modify: `src/app/_providers/index.tsx`
- Modify: `src/app/_css/app.scss` (line 47)

**Interfaces produced:**
- `SmoothScrollProvider` — client component, wraps children, initialises Lenis.
- `useSmoothScroll(): { scrollTo: (target: number | string) => void }` — consumed by
  `ScrollUp` in Task 28. Falls back to `window.scrollTo` when Lenis is inactive.

- [ ] **Step 1: Install**

```bash
yarn add gsap@^3.12.5 lenis@^1.1.18
```

- [ ] **Step 2: Create the provider**

Create `src/app/_providers/SmoothScroll/index.tsx`:

```tsx
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

    const onTick = (time: number): void => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)

    return () => {
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
```

- [ ] **Step 3: Wire it into Providers**

`src/app/_providers/index.tsx` becomes:

```tsx
'use client'

import React from 'react'

import { SmoothScrollProvider } from './SmoothScroll'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Stop native smooth scroll fighting Lenis**

In `src/app/_css/app.scss`, in the `html, body, #app` rule (~line 47), change
`scroll-behavior: smooth;` to:

```scss
  // Lenis owns smooth scrolling; native smooth-scroll fights it. The
  // reduced-motion block below already forces `auto` and stays as it is.
  scroll-behavior: auto;
```

Do **not** touch the `@media (prefers-reduced-motion: reduce)` block.

- [ ] **Step 5: Verify — including the AOS check, which is not optional**

```bash
yarn test && npx tsc --noEmit -p tsconfig.json && yarn lint
```

**Controller then verifies in-browser** (this is hazard 3, the biggest risk in the plan):
scroll the home page and confirm `data-aos` elements still receive `aos-animate` and
become visible. If Lenis has stopped native scroll events firing, every reveal on the site
is dead and this task must be reworked before proceeding.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Lenis smooth scroll wired to GSAP ScrollTrigger

Lenis owns smooth scrolling; GSAP's ticker drives its rAF loop and Lenis
reports scroll to ScrollTrigger, so the two never run on competing frames.
Native scroll-behavior: smooth is disabled because it fights Lenis.

Reduced-motion visitors get no virtual scroll at all — taking over scroll is
exactly what that preference asks us not to do."
```

---

## Task 28: Route ScrollUp through Lenis — DEPENDS ON 27

`ScrollUp` calls `window.scrollTo({ top: 0, behavior: 'smooth' })`, which bypasses Lenis
and produces a jump. Consume `useSmoothScroll()` and call `scrollTo(0)`; the context
already falls back to the native call when Lenis is inactive, so the reduced-motion path
needs no branch here.

Detailed steps written after Task 27 lands and its AOS check passes.

---

## Task 29: Pin the projects section and drive the sweep — DEPENDS ON 27

Replaces the hand-rolled scroll effect in `CollectionArchive` with a ScrollTrigger
`pin` + `scrub`. The pin duration is the sweep distance (`container.clientWidth +
track.scrollWidth`), so the sweep finishes exactly as the pin releases.

**Reduced-motion fallback is part of this task, not an afterthought:** when
`prefersReducedMotion()` is true, no ScrollTrigger is created, no pin happens, and `.grid`
becomes a plain horizontally-scrollable row (`overflow-x: auto`) so every card is still
reachable.

Detailed steps written after 27.

---

## Task 30: Stacks section slides up like paper — DEPENDS ON 29

Once the projects pin releases, the stacks section travels up over it. The current CSS
approach (96px overlap + hard top edge, commit a7fa0c3) is the static version of this and
will be replaced or driven by ScrollTrigger.

Detailed steps written after 29.
