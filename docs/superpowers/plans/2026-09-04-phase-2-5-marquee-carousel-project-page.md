# Phase 2.5 — Marquee, Carousel, and Project Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Make the hero marquee loop seamlessly, repair the projects scroll-carousel, and bring the project page into the site's neobrutalist language.

**Origin:** Site-owner feedback on 2026-09-04 after running the branch locally. Three
issues reported, classified as **two defects and one design task**:

1. The hero marquee does not loop infinitely — visible gap, and its background bar stops mid-row. **This is an incomplete fix from Phase 2 Task 6**, which made the keyframe valid without making it seamless.
2. The projects section does not move on scroll, and its cards overlap the section heading. The scroll-carousel **already exists** in `CollectionArchive` and is defective.
3. The project page does not match the site. Design work.

**Spec:** `docs/superpowers/specs/2026-09-03-portfolio-audit-roadmap.md`
**Predecessor plan:** `docs/superpowers/plans/2026-09-03-phases-0-2-implementation.md`

## Decisions taken (site owner, 2026-09-04)

| Decision | Choice |
|---|---|
| Project page scope | **Restyle to neobrutalist tokens AND rework the gallery.** The Slick carousel with rounded cards is the least on-brand element. |
| Project page hero | **Keep the purple + dot pattern, harden the edges.** `#9696FD` is a brand accent and belongs; square the corners, add the border/shadow treatment. |
| Order | **Bugs first (17, 18), then design (19, 20).** |

## Global Constraints

Same as the predecessor plan, restated because they still bind:

- **Do not touch anything under `src/payload/`** or `src/server.ts`. The Payload admin panel must keep working.
- **Every task ends green:** `yarn test`, `npx tsc --noEmit -p tsconfig.json`, `yarn lint` — all exit 0.
- **Conventional commits, no attribution trailer.**
- **Environment is Windows.** `yarn` resolves only in PowerShell, not Git Bash. Never read an exit code after a pipe; use `$LASTEXITCODE` on its own line.
- Run the dev server with **`yarn dev`** (now applies localhost overrides). `yarn dev:raw` is the original and 404s locally.

**Brand values are NO LONGER frozen for tasks 19-20** — those tasks exist to apply the
brand language. They are still frozen for tasks 17 and 18, which are bug fixes. The
values to apply are the existing ones, not new ones:

| Token | Value | Source |
|---|---|---|
| Primary | `rgb(241, 241, 241)` | `_css/colors.scss` |
| Secondary | `rgb(32, 32, 32)` | `_css/colors.scss` |
| Accent yellow | `rgb(253, 253, 150)` | `_css/colors.scss` |
| Accent purple | `rgb(150, 150, 253)` | `_css/colors.scss` |
| Accent pink | `rgb(253, 150, 202)` | `_css/colors.scss` |
| Border | `2px solid var(--theme-color-secondary)` | `Button/index.module.scss:17` |
| Hard shadow | `4px 4px 0px var(--theme-color-secondary)` | `Button/index.module.scss:18` |
| Display face | Space Grotesk | `layout.tsx` |
| Body face | Work Sans | `layout.tsx` |

---

## Task 17: Make the hero marquee loop seamlessly

**The defect.** `.techOverlay` contains two sibling `<ul class="technologies">`, and
**each carries the same `scroll` animation with no offset**. Each therefore travels 200%
of its own width (`translateX(100%)` → `translateX(-100%)`), which leaves a gap rather
than a continuous loop. Two aggravating factors: each `<ul>` paints its own
`background-color`, so the light bar visibly stops mid-row; and `.techOverlay`'s
`overflow-x: hidden` is **commented out**, so nothing clips the track.

**The correct pattern.** One track containing N identical copies, animated
`translateX(0)` → `translateX(-100%/N)`. With 2 copies that is `-50%`: copy 2 arrives
exactly where copy 1 began, so the loop is seamless. The background belongs on the
clipping container, not on the copies.

**Files:**
- Modify: `src/app/_heros/Revamp/index.tsx` (the ticker render block, ~line 154)
- Modify: `src/app/_heros/Revamp/index.module.scss` (`.techOverlay`, `.technologies`, `@keyframes scroll`)

**Interfaces:**
- Consumes: nothing
- Produces: a new `.track` class in the SCSS module, consumed only by this hero

- [ ] **Step 1: Wrap the copies in a track**

In `src/app/_heros/Revamp/index.tsx`, replace the ticker block:

```tsx
        <div className={classes.techOverlay}>
          <div className={classes.track}>
            {Array.from({ length: 2 }).map((_, i) => (
              <TechnologyList
                technologies={technologies}
                className={classes.technologies}
                ariaHidden={i !== 0}
                key={i}
              />
            ))}
          </div>
        </div>
```

Keep the copy count at 2 and keep `ariaHidden={i !== 0}` — the duplicate is decorative
and must stay hidden from assistive technology.

- [ ] **Step 2: Restructure the SCSS**

Replace the `.techOverlay`, `.technologies` and `@keyframes scroll` rules:

```scss
.techOverlay {
  background-color: var(--theme-color-secondary);
  position: relative;
  padding: 0.33rem;
  width: 100%;
  // Required: without this the track is not clipped and the copies spill out.
  overflow: hidden;
  display: block;
  transition: 0.3s ease-in-out;

  &:hover .track {
    animation-play-state: paused;
  }
}

.track {
  display: flex;
  width: max-content;
  animation: scroll 20s linear infinite;
}

.technologies {
  padding: 0;
  margin: 0;
  font: 100 max(16px, 1vw) / max(24px, 2vw) var(--font-work-sans);
  list-style: none;
  display: flex;
  flex: 0 0 auto;
  white-space: nowrap;
  user-select: none;
  color: var(--theme-color-primary);

  li {
    display: inline-flex;
    margin-right: 1rem;
  }

  li:not(li:empty)::before {
    content: '•';
    margin-right: 1rem;
  }
}

@keyframes scroll {
  from {
    transform: translateX(0);
  }
  to {
    // Exactly one copy's width, because the track holds two identical copies.
    transform: translateX(-50%);
  }
}
```

Note what changed and why:
- `background-color` **removed from `.technologies`** — the container owns it now, which
  is what makes the bar continuous instead of stopping at the end of copy 1.
- `overflow: hidden` **uncommented** on the container.
- The animation **moved off the copies onto the track**, so the copies no longer move
  independently.
- The hover-pause selector moved from `&:hover > *` to `&:hover .track`, following the
  animation. **This must keep working** — it is an existing feature.

- [ ] **Step 3: Verify**

```bash
yarn test && npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: all three exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/_heros/Revamp/index.tsx src/app/_heros/Revamp/index.module.scss
git commit -m "fix: make hero marquee loop seamlessly

Both list copies carried the same animation with no offset, so each
travelled 200% of its own width and left a gap. Move the animation to a
single track of two copies and translate it -50%, so copy two lands where
copy one began. Background moves to the clipping container so the bar no
longer stops mid-row, and overflow:hidden is restored."
```

**Controller verifies in-browser:** the bar spans the full width continuously, the loop
has no gap or jump at the wrap point, and hovering still pauses it.

---

## Task 18: Repair the projects scroll-carousel

**Five distinct defects** in `src/app/_components/CollectionArchive/index.tsx`:

1. **Observer leak.** An `IntersectionObserver` is constructed in the *render body* (line ~212) behind `if (archiveRef.current)`. It creates a new observer on every render and never disconnects.
2. **CSS and JS fight over the transform.** The SCSS sets `width: 150%; transform: translateX(25%)`; the scroll handler then overwrites it with `translateX(<n>px)`, discarding the 25% offset. **This is why the cards slide over the section heading.**
3. `translateXValue` initialises from `halfElementWidth`, which is `0` and never assigned.
4. The transform is applied *before* the state update, so the DOM is always one frame stale.
5. `setY` runs on every scroll event, re-creating `handleScroll` and re-registering the listener continuously — a re-render per scroll event.

**The fix:** replace accumulated deltas with a **deterministic mapping from scroll
position to offset**, computed in a rAF-throttled listener that owns the transform
outright. No state, no re-renders, no listener churn, and cleanup on unmount.

**Files:**
- Modify: `src/app/_components/CollectionArchive/index.tsx`
- Modify: `src/app/_components/CollectionArchive/index.module.scss`

**Interfaces:**
- Consumes: nothing
- Produces: nothing — internal to the component

- [ ] **Step 1: Remove the broken machinery**

Delete these from the component: the `y`, `translateXValue`, `halfElementWidth` and
`intersecting` state (and their setters), the `handleScroll` callback, the `useEffect`
that registers it, and the bare `if (archiveRef.current) { ... new IntersectionObserver ... }`
block in the render body. Leave `archiveRef`, `scrollRef`, `isLoading`, `error`, `page`
and the data-fetching effects untouched.

- [ ] **Step 2: Add the deterministic scroll effect**

Add this single effect in their place:

```tsx
  // Horizontal scroll-carousel.
  //
  // Maps vertical scroll position deterministically to a horizontal offset,
  // rather than accumulating deltas — accumulation drifts, fights the CSS
  // transform, and cannot recover from a resize or a jump-scroll.
  React.useEffect(() => {
    const el = archiveRef.current
    if (!el) return undefined

    let frame = 0

    const update = (): void => {
      const track = el.firstElementChild as HTMLElement | null
      if (!track) return

      const maxShift = Math.max(track.scrollWidth - el.clientWidth, 0)
      if (maxShift === 0) {
        el.style.transform = 'translateX(0px)'
        return
      }

      const rect = el.getBoundingClientRect()
      const travel = rect.height + window.innerHeight
      const raw = (window.innerHeight - rect.top) / travel
      const progress = Math.min(Math.max(raw, 0), 1)

      el.style.transform = `translateX(${-(progress * maxShift)}px)`
    }

    const onScroll = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [results])
```

The `results` dependency matters: the track's width is unknown until the cards render,
so the effect must re-measure when the fetched results change.

- [ ] **Step 3: Stop the CSS fighting the JS**

In `src/app/_components/CollectionArchive/index.module.scss`, replace the
`.collectionArchive` rule:

```scss
.collectionArchive {
  width: 100%;
  overflow: hidden;
  // The horizontal offset is owned entirely by the scroll effect in
  // index.tsx. Do not set `transform` here — a CSS transform and an inline
  // transform cannot coexist, and the JS one wins, silently dropping this.
  transition: transform 200ms linear;
}
```

`width: 150%` and `transform: translateX(25%)` are both removed. The 150% width combined
with the JS transform is what pushed the cards over the heading.

- [ ] **Step 4: Verify**

```bash
yarn test && npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: all three exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/_components/CollectionArchive/index.tsx src/app/_components/CollectionArchive/index.module.scss
git commit -m "fix: repair projects scroll-carousel

Replaces accumulated-delta scrolling with a deterministic mapping from
scroll position to horizontal offset. Fixes an IntersectionObserver
constructed in the render body that leaked a new observer per render, a
CSS transform silently overwritten by the inline one (which is why cards
overlapped the heading), an uninitialised offset, a one-frame-stale
transform, and a scroll listener re-registered on every event."
```

**Controller verifies in-browser:** cards move horizontally as the section is scrolled
through, they no longer overlap the heading, and no observer accumulation appears.

---

## Task 19: Restyle the project page to the brand language — DESIGN

Depends on 17 and 18 being reviewed.

**Direction (owner-approved):** keep the purple dot-pattern hero — `#9696FD` is a brand
accent and belongs — but harden its edges. Everything below it adopts the same language
as `Button`: `2px` borders, `4px 4px 0` offset shadows, square corners, Space Grotesk
display / Work Sans body.

**Files:** `src/app/_heros/ProjectHero/**`, `src/app/(pages)/projects/[slug]/**`, and the
project-page-specific block styles they use.

Detailed steps to be written once 17 and 18 land, so the implementer works against a
verified-good baseline. **Do not begin this task from this stub.**

---

## Task 20: Rework the project gallery — DESIGN

Depends on 19.

The gallery currently uses `react-slick` with rounded cards — the least on-brand element
on the page. Owner approved replacing it. Candidate directions to settle before writing
steps: a hard-edged grid with offset shadows, or a slider retaining Slick's behaviour
with the rounded/soft styling stripped out.

Note `react-slick` and `slick-carousel` are **live dependencies** — `ProjectBlock`
imports them. If the gallery moves away from Slick entirely, check whether any other
consumer remains before removing the packages.

Detailed steps to be written after 19. **Do not begin this task from this stub.**

---

# ADDENDUM — Tasks 21 & 22 (site-owner feedback, 2026-09-04, second round)

After running the fixed build the owner reported both strips should be **full-bleed**:

> "the carousel of tech stacks on the hero is really overflowing and has to look like
> infinitely moving sideways without empty gaps"
>
> "the project carousel should also extend and break the container, it move across the
> screen on scroll so they look like moved to the left by the scrolling action, or move
> to the right when scrolled to top"

**Decisions taken (owner, 2026-09-04):**

| Decision | Choice |
|---|---|
| Projects layout | **Heading above, cards full-bleed below.** Stack them; the strip gets the whole screen width to travel across. |
| Scroll feel | **Deterministic — keep as is.** Position stays a pure function of scroll; reversing retraces exactly. |

**Measured facts these tasks rely on** (taken from the running site at 1440x900, not
inferred from source):

- `.hero` is a `Gutter`, `position: relative`, `overflow: hidden`, border box = viewport width.
- `.content` left edge = 144px = exactly `.hero`'s gutter (`--gutter-h` is 144px at ≤1440).
  So `margin-left: calc(var(--gutter-h) * -1)` lands an element at viewport x = 0.
- `.techOverlay` currently: left 144, width 629 (its column), `overflow: hidden`.
- One marquee copy = 1972px; at the 629px window that is a 3.1x margin, but against a
  full-width 1440px window it drops to 1.37x.
- `.projects` (the ArchiveBlock's blockName class) is `display: flex; flex-direction: row`
  — this is what puts the heading beside the cards.
- `.archiveBlock` measures 1425px at a 1440px viewport, i.e. already effectively full width.

---

## Task 21: Make the hero ticker a full-bleed band

**Files:**
- Modify: `src/app/_heros/Revamp/index.module.scss` (`.techOverlay`)
- Modify: `src/app/_heros/Revamp/index.tsx` (copy count + a comment)

- [ ] **Step 1: Break the band out to viewport width**

In `.techOverlay`, add two declarations. Change nothing else in the rule — it already has
the `overflow: hidden`, the background, and the `&:hover .track` pause that must survive:

```scss
  // Full-bleed: `.content`'s left edge sits exactly on `.hero`'s gutter, so pulling
  // left by one gutter lands this at viewport x = 0. `.hero` has `overflow: hidden`
  // and a border box of exactly the viewport, so the scrollbar overhang from `100vw`
  // is clipped rather than producing a horizontal scrollbar.
  width: 100vw;
  margin-left: calc(var(--gutter-h) * -1);
```

- [ ] **Step 2: Double the seam safety margin**

Going full-bleed widens the window from 629px to ~1440px, cutting the margin between one
copy's width and the window from 3.1x to 1.37x. A shorter stack list from the CMS would
reintroduce the gap. Raise the copy count from 2 to 4 in `src/app/_heros/Revamp/index.tsx`:

```tsx
          {/* Copy count is coupled to the `scroll` keyframe's -50% in index.module.scss:
              the translate must equal a whole number of copies, and -50% of N copies is
              N/2 copies — so N must stay EVEN. 4 copies means the loop translates by two
              copies, so the band stays gapless as long as 2 copies span the viewport.
              Changing this number without changing that keyframe reintroduces the gap. */}
          {Array.from({ length: 4 }).map((_, i) => (
```

The keyframe stays `translateX(0)` → `translateX(-50%)` — do NOT change it. Keep
`ariaHidden={i !== 0}` so only the first copy is exposed to assistive technology.

- [ ] **Step 3: Verify**

```bash
yarn test && npx tsc --noEmit -p tsconfig.json && yarn lint
```

- [ ] **Step 4: Commit**

```bash
git add src/app/_heros/Revamp/index.module.scss src/app/_heros/Revamp/index.tsx
git commit -m "feat: make the hero tech ticker a full-bleed band

The ticker was confined to the 629px text column. Pull it left by one
gutter and span 100vw so it runs edge to edge; .hero already clips, so the
scrollbar overhang does not create a horizontal scrollbar.

Also raises the copy count 2 -> 4. Full width cuts the margin between one
copy and the window from 3.1x to 1.37x, so a shorter CMS stack list would
have reintroduced the gap; translating -50% of four copies moves two, which
doubles the headroom while keeping the loop exact."
```

---

## Task 22: Stack the projects heading and make the card strip full-bleed

**Files:**
- Modify: `src/app/_blocks/ArchiveBlock/index.module.scss` (`.projects`, `.introContent`)
- Modify: `src/app/_components/CollectionArchive/index.tsx` (carried-over minor: NaN guard)

- [ ] **Step 1: Stack the section**

In `.projects`, change the flex direction and let the section grow to fit both rows.
Replace only these declarations, leaving the typography, the `::before` dot pattern, the
card rules and the `mid-break` block exactly as they are:

```scss
  height: auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-direction: column;
```

`align-items: center` becomes `stretch` so the strip row takes the full block width
rather than shrinking to its content.

- [ ] **Step 2: Let the heading span the stacked row**

`.introContent` is `width: 50vw`, sized for the old side-by-side layout. Stacked, it
should read as a normal heading block:

```scss
.introContent {
  width: 100%;
  margin-top: calc(var(--base) * 2);
  margin-bottom: calc(var(--base) * 2);

  @include mid-break {
    width: 100%;
  }
}
```

- [ ] **Step 3: Drop the stale flex-child rule**

`.projects` contains `div:nth-of-type(2) { flex: 1; gap: 8px; ... }`, which sized the
archive wrapper as a flex child of the old ROW. In a column it makes the wrapper stretch
vertically instead. Replace the `flex: 1` with an explicit width so it spans the row:

```scss
  div:nth-of-type(2){
    width: 100%;
    gap: 8px;

    @media screen {
      gap: 16px;
    }
  }
```

- [ ] **Step 4: Carried-over minor — guard `progress` against NaN**

From the Task 17+18 review (Minor 5). In the scroll effect in
`src/app/_components/CollectionArchive/index.tsx`, `raw` is `0/0 = NaN` when both
`rect.height` and `window.innerHeight` are 0 (hidden iframe, some print contexts), and
`Math.min(Math.max(NaN, 0), 1)` is `NaN` — clamping does not sanitise it. That yields
`translateX(NaNpx)`, an invalid declaration the browser drops, freezing the track.

Replace the clamp line:

```tsx
      const progress = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 1) : 0
```

- [ ] **Step 5: Verify**

```bash
yarn test && npx tsc --noEmit -p tsconfig.json && yarn lint
```

- [ ] **Step 6: Commit**

```bash
git add src/app/_blocks/ArchiveBlock/index.module.scss src/app/_components/CollectionArchive/index.tsx
git commit -m "feat: stack the projects heading above a full-bleed card strip

The section was a flex row, which pinned the cards into a 689px column
beside the heading. Stacking it gives the strip the full block width to
travel across, and removes any possibility of the cards overlapping the
heading.

Also guards the scroll mapping against a NaN progress value, which would
emit translateX(NaNpx) and silently freeze the track."
```
