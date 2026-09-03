# Portfolio Phases 0–2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a schema rollback path, remove the unreachable front-end auth stack without touching the Payload admin panel, and repair the seven animation defects the site owner actually reports seeing.

**Architecture:** Three phases executed as two parallel tracks. **Track A** needs no database and starts immediately: dependency removal, the `AuthProvider` → `useAdminUser` swap, front-end route deletion, and all animation repair. **Track B** is gated on a populated `.env` and covers anything that alters the Postgres schema — the baseline migration, then removal of the `premiumContent` field and `Comments` collection. Track A's demolition is deliberately ordered so the `AdminBar` carve-out lands *before* the auth pages are deleted, keeping the tree compiling at every commit.

**Tech Stack:** Payload 2.30.3 · Next 13.5.2 (app router) · React 18 · TypeScript 4.9 · SCSS modules · AOS 3.0 · Postgres via `@payloadcms/db-postgres` · Yarn

**Spec:** `docs/superpowers/specs/2026-09-03-portfolio-audit-roadmap.md`

---

## Global Constraints

These apply to every task in this plan.

**MUST NOT BE DELETED OR MODIFIED — the admin panel and its dependencies.** The site owner requires the admin login and dashboard to keep working. This is distinct from the front-end auth surface being removed.

- `src/server.ts` — mounts the admin panel via `payload.init({ express: app })`
- `src/payload/payload.config.ts` — `admin` block, bundler, `Logo` graphic
- `src/payload/collections/Users/**` — including `auth: true`, `checkRole.ts`, and the `ensureFirstUserIsAdmin` / `loginAfterCreate` hooks
- `src/payload/access/admins.ts`, `adminsOrPublished.ts`, `anyone.ts`
- `src/payload/components/Graphics/Logo`
- Every collection and global except `Comments`
- The `/admin` route and all Payload-served admin assets

**Distinguish the three login surfaces.** `/admin` is the Payload admin panel — **keep**. `src/app/(pages)/_login/` is the template's front-end customer login — **delete**; note its `_` prefix makes it a Next.js private folder, so it is already unrouted and returns 404 today. `AdminBar` is the front-end inline-edit bar — **keep**, via the Task 4 carve-out.

**Brand values are frozen.** No color, font size, border width, or shadow offset changes in this plan. Those belong to Phase 3. The only styling touched here is animation timing and the `.hide` rule removed in Task 4.

**Every task ends green.** `npx tsc --noEmit -p tsconfig.json` and `yarn lint` must both pass before any commit. `tsc` currently exits 0 — that is the baseline and must not regress.

**Commit format:** conventional commits, no attribution trailer.

---

## Verification Strategy — read before Task 1

This project has **zero tests and no test runner** (finding O2). The approved roadmap explicitly defers the test strategy rather than scheduling it, so **this plan does not introduce a test framework**, and consequently does not follow a red-green TDD cycle. That is a deliberate deviation from the default workflow, made to respect the approved scope.

What replaces it, per task:

1. `npx tsc --noEmit -p tsconfig.json` — exits 0 today; a non-zero exit is a regression.
2. `yarn lint` — ESLint is configured.
3. `yarn build:payload` — proves the admin bundle still compiles, the primary guard on the Global Constraints above.
4. **Explicit browser verification** for every animation task, with the exact observation that constitutes a pass. Animation correctness is not unit-testable; a stated observation is the honest gate.

**Resolved:** the site owner approved adding a test runner. **Task 0 installs Vitest**, and the three genuinely unit-testable items — the stagger cap (Task 10), the AOS refresh trigger (Task 9), and the reduced-motion predicate (Task 12) — follow a real red-green cycle against it. Everything else keeps the gates above, because CSS keyframes and IntersectionObserver thresholds are verified by observation, not assertion. Do not write tests that merely restate the implementation to manufacture coverage.

---

# TRACK A — Unblocked, starts immediately

## Task 0: Install Vitest

Establishes the red-green cycle used by Tasks 9, 10 and 12. Nothing else in the plan depends on it, so it goes first and stays small.

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Consumes: nothing
- Produces: `yarn test` (single run) and `yarn test:watch`. Tests live beside their subject as `*.test.ts` / `*.test.tsx`. jsdom is the environment, so `window.matchMedia` and DOM APIs are available.

- [ ] **Step 1: Install**

```bash
yarn add -D vitest@^1.6.0 @vitejs/plugin-react@^4.3.1 jsdom@^24.1.0 @testing-library/react@^15.0.7 @testing-library/jest-dom@^6.4.5
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 3: Create `src/test/setup.ts`**

`window.matchMedia` does not exist in jsdom and Task 12's predicate depends on it, so it is stubbed here with a mutable default.

```ts
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom has no matchMedia. Default to "no preference"; individual tests
// override this to assert reduced-motion behaviour.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

- [ ] **Step 4: Add the scripts**

In `package.json`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 5: Prove the runner works with a throwaway test**

Create `src/test/sanity.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('vitest wiring', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })

  it('has a jsdom window with a stubbed matchMedia', () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false)
  })
})
```

Run: `yarn test`
Expected: 2 passing.

- [ ] **Step 6: Delete the throwaway and confirm the suite is empty-but-green**

```bash
git rm --cached src/test/sanity.test.ts 2>/dev/null; rm -f src/test/sanity.test.ts
yarn test
```

Expected: vitest reports no test files, exit 0. It has served its purpose — proving the harness works.

- [ ] **Step 7: Verify nothing else regressed**

```bash
npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: both exit 0.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json yarn.lock
git commit -m "test: add vitest with jsdom and matchMedia stub"
```

---

## Task 1: Remove unused dependencies

Three packages are installed with zero imports anywhere in `src/`. Removing them first shrinks every later `yarn install` and proves the build gate works before anything risky happens.

**Files:**
- Modify: `package.json` (dependencies block)
- Modify: `yarn.lock` (regenerated)

**Interfaces:**
- Consumes: nothing
- Produces: nothing — pure subtraction

- [ ] **Step 1: Confirm each package has zero imports**

```bash
for p in react-router-dom react-gsap react-fast-marquee; do
  echo "== $p"
  grep -rn "$p" src --include=*.ts --include=*.tsx --include=*.scss | wc -l
done
```

Expected: `0` for all three. If any is non-zero, STOP and report — the audit finding was wrong.

- [ ] **Step 2: Remove them**

```bash
yarn remove react-router-dom react-gsap react-fast-marquee
```

- [ ] **Step 3: Verify the tree still compiles**

```bash
npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock
git commit -m "chore: remove unused react-router-dom, react-gsap, react-fast-marquee"
```

---

## Task 2: Strip GSAP from the AOS provider

GSAP and `ScrollTrigger` are imported and registered in the root layout but drive zero animations. This is the single largest unused payload on every page.

**Files:**
- Modify: `src/app/_providers/AOS/index.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing
- Produces: `AOSWrapper` default export — unchanged signature, still `({ children }: { children: React.ReactNode })`. Task 9 rewrites this file's internals.

- [ ] **Step 1: Confirm GSAP drives nothing**

```bash
grep -rn "gsap\|ScrollTrigger\|Tween\|Timeline" src --include=*.tsx --include=*.ts
```

Expected: matches **only** in `src/app/_providers/AOS/index.tsx`. Any other match means GSAP is live — STOP and report.

- [ ] **Step 2: Rewrite the provider without GSAP**

Replace the entire contents of `src/app/_providers/AOS/index.tsx`:

```tsx
'use client'
import React, { Fragment } from 'react'
import AOS from 'aos'

import 'aos/dist/aos.css'

const AOSWrapper = ({ children }: { children: React.ReactNode }) => {
  React.useEffect(() => {
    AOS.init()
  }, [])

  return <Fragment>{children}</Fragment>
}

export default AOSWrapper
```

- [ ] **Step 3: Remove the package**

```bash
yarn remove gsap
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/_providers/AOS/index.tsx package.json yarn.lock
git commit -m "perf: drop unused gsap and ScrollTrigger from root layout"
```

---

## Task 3: Delete the front-end auth routes

These are the template's customer-account pages. `_login` is already unrouted by Next's private-folder convention; the rest route but lead nowhere, because `Users.create` is admin-only.

**Do not touch `/admin`, `src/payload/collections/Users/`, or `src/payload/access/`.**

**Files:**
- Delete: `src/app/(pages)/_login/` (whole directory)
- Delete: `src/app/(pages)/account/` (whole directory)
- Delete: `src/app/(pages)/logout/` (whole directory)
- Delete: `src/app/(pages)/recover-password/` (whole directory)
- Delete: `src/app/(pages)/reset-password/` (whole directory)
- Delete: `src/app/_utilities/getMeUser.ts`
- Delete: `src/app/_api/getMe.ts`

**Interfaces:**
- Consumes: nothing
- Produces: removes the `getMeUser` and `getMe` symbols. After this task the only remaining `useAuth` consumers are `AdminBar`, `Header/Nav`, `PremiumContent`, and `Comments/CommentForm` — Tasks 4 and 5 handle those.

- [ ] **Step 1: Record the current `useAuth` consumer set**

```bash
grep -rln "useAuth" src --include=*.tsx
```

Expected, before deleting: 9 files — the 5 auth pages, `CommentForm`, `AdminBar`, `Header/Nav`, `PremiumContent`, plus the provider itself.

- [ ] **Step 2: Delete the directories and helpers**

```bash
git rm -r "src/app/(pages)/_login" "src/app/(pages)/account" "src/app/(pages)/logout" \
          "src/app/(pages)/recover-password" "src/app/(pages)/reset-password"
git rm src/app/_utilities/getMeUser.ts src/app/_api/getMe.ts
```

- [ ] **Step 3: Confirm nothing references the deleted routes**

```bash
grep -rn "getMeUser\|_api/getMe\|/recover-password\|/reset-password\|href=\"/login\"\|href=\"/account\"" src --include=*.ts --include=*.tsx
```

Expected: no output. The `/login` link inside `logout/LogoutPage` is deleted along with its directory.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: both exit 0. `AdminBar`, `Nav`, `PremiumContent` and `CommentForm` still import `useAuth`, which still exists — the tree stays green.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: remove unreachable front-end auth routes"
```

---

## Task 4: Replace AuthProvider with useAdminUser, and unhide the nav

The carve-out. `AdminBar` is worth keeping, and it is the only remaining legitimate consumer of user state. It gets a ~30-line read-only hook in place of a 218-line seven-method provider. **This task also fixes C2** — the nav stops hiding itself behind an auth fetch.

**Files:**
- Create: `src/app/_providers/AdminUser/index.tsx`
- Modify: `src/app/_components/AdminBar/index.tsx:7,37`
- Modify: `src/app/_components/Header/Nav/index.tsx:7,16,19`
- Modify: `src/app/_components/Header/Nav/index.module.scss:43-46`
- Modify: `src/app/_providers/index.tsx`
- Delete: `src/app/_providers/Auth/index.tsx`

**Interfaces:**
- Consumes: `User` type from `src/payload/payload-types`
- Produces: `useAdminUser(): { user: User | null; isLoading: boolean }` — named export from `src/app/_providers/AdminUser`. No provider component and no context; it is a self-contained hook, so `Providers` loses a nesting level. Task 5 relies on `useAuth` being fully gone after this task.

- [ ] **Step 1: Create the hook**

Create `src/app/_providers/AdminUser/index.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

import type { User } from '../../../payload/payload-types'

/**
 * Read-only view of the currently authenticated Payload user.
 *
 * This exists solely so the front-end AdminBar can decide whether to render.
 * It deliberately offers no login, logout, or account mutation: the site has
 * no public account system, and the admin panel at /admin owns authentication.
 */
export const useAdminUser = (): { user: User | null; isLoading: boolean } => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`, {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error('Not authenticated')
        }

        const { user: me } = await res.json()

        if (!cancelled) {
          setUser(me ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return { user, isLoading }
}
```

- [ ] **Step 2: Point AdminBar at the hook**

In `src/app/_components/AdminBar/index.tsx`, replace the import on line 7:

```tsx
import { useAdminUser } from '../../_providers/AdminUser'
```

and line 37:

```tsx
  const { user } = useAdminUser()
```

Everything else in that file is unchanged — `isAdmin`, the `show` effect, and the early `return null` all still work, because the hook returns `null` for anonymous visitors exactly as the provider did.

- [ ] **Step 3: Unhide the nav**

In `src/app/_components/Header/Nav/index.tsx`, delete the `useAuth` import on line 7 and the `const { user } = useAuth()` call on line 16, then replace the `<nav>` opening tag on line 19:

```tsx
    <nav className={classes.nav}>
```

The nav no longer depends on user state at all, so it renders immediately.

- [ ] **Step 4: Remove the now-dead hide rule**

In `src/app/_components/Header/Nav/index.module.scss`, delete the trailing `.hide` block:

```scss
.hide {
  opacity: 0;
  visibility: hidden;
}
```

Leave `.nav`'s own `opacity: 1` / `visibility: visible` / `transition` declarations in place — those are Phase 3's business, not this task's.

- [ ] **Step 5: Simplify Providers**

Replace `src/app/_providers/index.tsx`:

```tsx
'use client'

import React from 'react'

import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return <ThemeProvider>{children}</ThemeProvider>
}
```

- [ ] **Step 6: Delete the old provider**

```bash
git rm -r src/app/_providers/Auth
```

- [ ] **Step 7: Verify no `useAuth` references survive outside the doomed files**

```bash
grep -rn "useAuth\|_providers/Auth" src --include=*.tsx
```

Expected: matches only in `src/app/_components/PremiumContent/index.tsx` and `src/app/_blocks/Comments/CommentForm/index.tsx`, both deleted in Task 5. `tsc` will fail until Task 5 lands — this is the one planned red point in Track A, and Tasks 4 and 5 therefore commit together at the end of Task 5.

- [ ] **Step 8: Do NOT commit yet**

Proceed directly to Task 5. Committing here would leave `main` non-compiling.

---

## Task 5: Delete PremiumContent and the Comments front-end

Removes the last two `useAuth` consumers and the synthesized comments block on the post page. The `Comments` *collection* and the `premiumContent` *field* are schema and belong to Track B — this task is front-end only.

**Files:**
- Delete: `src/app/_components/PremiumContent/` (whole directory)
- Delete: `src/app/_blocks/Comments/` (whole directory)
- Delete: `src/app/_api/fetchComments.ts`
- Modify: `src/app/(pages)/posts/[slug]/page.tsx`

**Interfaces:**
- Consumes: the `useAdminUser` hook from Task 4 (indirectly — this task removes the last competing consumer)
- Produces: `posts/[slug]/page.tsx` renders `PostHero` + `Blocks` + `RelatedPosts` only

- [ ] **Step 1: Delete the components**

```bash
git rm -r src/app/_components/PremiumContent src/app/_blocks/Comments
git rm src/app/_api/fetchComments.ts
```

- [ ] **Step 2: Strip the post page**

In `src/app/(pages)/posts/[slug]/page.tsx`, remove these imports:

```tsx
import { fetchComments } from '../../../_api/fetchComments'
import { PremiumContent } from '../../../_components/PremiumContent'
```

and the `Comment` type from the `payload-types` import, leaving `import { Post } from '../../../../payload/payload-types'`.

Then delete the `const comments = await fetchComments({ doc: post?.id })` call, drop `enablePremiumContent` and `premiumContent` from the destructure so it reads `const { layout, relatedPosts } = post`, and remove both the `{enablePremiumContent && <PremiumContent … />}` line and the entire synthesized `<Blocks blocks={[{ blockType: 'comments', … }]} />` element.

- [ ] **Step 3: Confirm the whole auth surface is gone**

```bash
grep -rn "useAuth\|_providers/Auth\|PremiumContent\|fetchComments" src --include=*.ts --include=*.tsx
```

Expected: no output.

- [ ] **Step 4: Verify — this is where the tree returns to green**

```bash
npx tsc --noEmit -p tsconfig.json && yarn lint && yarn build:payload
```

Expected: all three exit 0. `build:payload` is the guard that the admin panel still bundles.

- [ ] **Step 5: Browser check — admin panel intact**

Start the dev server, then confirm, in order:

1. `/admin` renders the Payload login screen with the custom Logo.
2. Logging in reaches the dashboard, listing Pages, Posts, Projects, Media, Categories, Users, Stacks.
3. The public site's header nav is **visible immediately** on a hard refresh with cache disabled — no flash of missing nav. This is C2 confirmed fixed.
4. While logged in, the AdminBar appears on a public page.
5. `/login`, `/account`, `/logout` all return 404.

- [ ] **Step 6: Commit Tasks 4 and 5 together**

```bash
git add -A
git commit -m "feat: replace AuthProvider with read-only useAdminUser, remove premium content and comments UI

The front-end auth surface was unreachable: Users.create is admin-only and
the _login route was never routed. AdminBar keeps working via a read-only
hook. Fixes the nav hiding itself behind an auth fetch that could not resolve.

The Payload admin panel at /admin is untouched."
```

---

## Task 6: Fix the hero ticker's invalid keyframe (A1)

`translateX(100)` is unitless. The browser discards the whole declaration, so the `from` keyframe is dropped and the ticker pops instead of scrolling.

**Files:**
- Modify: `src/app/_heros/Revamp/index.module.scss:154-161`

**Interfaces:**
- Consumes: nothing
- Produces: nothing — CSS only

- [ ] **Step 1: Confirm the defect**

```bash
sed -n '154,161p' src/app/_heros/Revamp/index.module.scss
```

Expected: `transform: translateX(100);` inside `@keyframes scroll`.

- [ ] **Step 2: Fix the unit**

```scss
@keyframes scroll {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(-100%);
  }
}
```

- [ ] **Step 3: Browser check**

Load the home page and watch the hero technology ticker through two full cycles.
**Pass:** the list scrolls continuously right-to-left and wraps without a visible jump or backwards snap at the cycle boundary.
**Fail:** any hard pop — if so, the track width, not the keyframe, is the problem; report rather than patching further.

- [ ] **Step 4: Commit**

```bash
git add src/app/_heros/Revamp/index.module.scss
git commit -m "fix: add missing unit to hero ticker keyframe translateX"
```

---

## Task 7: Remove the dead hover state and theme-lock (A7, A8)

Two defects in the same block. The hover rule targets a base `opacity` that is commented out, and `.technologies` hardcodes `black` under `mix-blend-mode: difference`, which inverts meaning between themes.

**Files:**
- Modify: `src/app/_heros/Revamp/index.module.scss:110-145`

**Interfaces:**
- Consumes: `--theme-color-primary` / `--theme-color-secondary`, already defined in `_css/theme.scss`
- Produces: nothing — CSS only

- [ ] **Step 1: Delete the no-op hover**

In the `.technology_wrapper` rule, remove:

```scss
  &:hover {
    opacity: 1;
  }
```

The base `opacity: 0.3` it was written against is commented out, so this changes nothing visually. Leave the `&:hover > * { animation-play-state: paused; }` rule — that one works and is worth keeping.

- [ ] **Step 2: Make the ticker theme-aware**

In `.technologies`, replace:

```scss
  background-color: black;
  mix-blend-mode: difference;
  color: var(--color-primary);
```

with:

```scss
  background-color: var(--theme-color-secondary);
  color: var(--theme-color-primary);
```

Dropping `mix-blend-mode` is the point: the inversion is what made the block theme-dependent. The token pair reproduces the intended dark-on-light / light-on-dark result in both themes explicitly.

- [ ] **Step 3: Browser check both themes**

Load the home page, toggle the theme selector, and inspect the hero ticker in each.
**Pass:** legible contrast in both light and dark; the ticker's background is the inverse of the page ground in both.
**Fail:** identical background in both themes, or unreadable text in either.

- [ ] **Step 4: Commit**

```bash
git add src/app/_heros/Revamp/index.module.scss
git commit -m "fix: remove no-op hover and theme-lock from hero ticker"
```

---

## Task 8: Repair the work-experience twist animation (A2)

**Read this carefully — the original audit misdiagnosed this finding.** The animation *is* scroll-triggered by an `IntersectionObserver`. The defects are timing and brittleness, not the trigger mechanism.

**Files:**
- Modify: `src/app/_blocks/Content/index.tsx:21-56`
- Modify: `src/app/_blocks/Content/index.module.scss:149-166`

**Interfaces:**
- Consumes: `classes.twistLeft` / `classes.twistRight` from the co-located SCSS module
- Produces: nothing — internal to the Content block

- [ ] **Step 1: Remove the post-intersection delay**

In `src/app/_blocks/Content/index.module.scss`, delete the `animation-delay: 1s;` line from **both** `.twistRight` and `.twistLeft`. The class is added at the moment of intersection, so the delay is a full second of nothing after the element is already visible. Keep `animation-duration`, `animation-timing-function`, `animation-fill-mode` and `transform-origin` exactly as they are — the resting tilt is intentional design, not a bug.

- [ ] **Step 2: Give the observer a real threshold and stop re-firing**

In `src/app/_blocks/Content/index.tsx`, replace the `twistObserver` factory:

```tsx
    const twistObserver = (direction: 'left' | 'right') => {
      const className = classes[`twist${direction.charAt(0).toUpperCase()}${direction.slice(1)}`]

      return new IntersectionObserver(
        (entries, observer) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) {
              return
            }

            entry.target.classList.add(className)
            observer.unobserve(entry.target)
          })
        },
        { threshold: 0.25 },
      )
    }
```

Two changes: `threshold: 0.25` means the element is a quarter visible before it animates, rather than firing at one pixel; and `observer.unobserve` stops the callback re-adding a class it already added.

- [ ] **Step 3: Make the magic string visible**

The effect is gated on `blockName !== 'work_exp'`, matching a **CMS-authored block name**. Renaming that block in the admin panel silently kills the animation. Do not change the behaviour in this task — changing it needs a CMS field, which is Phase 3 scope. Add the warning directly above the guard:

```tsx
    // NOTE: this animation is bound to the CMS-authored block name "work_exp".
    // Renaming that block in the admin panel silently disables the animation.
    // Phase 3 should replace this with an explicit CMS toggle field.
    if (blockName !== 'work_exp') {
      return
    }
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: both exit 0.

- [ ] **Step 5: Browser check**

Load the page containing the work-experience block. Scroll down at a normal reading pace.
**Pass:** each entry tilts as it reaches roughly a quarter of the way into the viewport, and the tilt completes while the element is still comfortably on screen.
**Fail:** the tilt still happens off-screen or is already complete on arrival — if so, raise `threshold` toward `0.4` and re-observe.

- [ ] **Step 6: Commit**

```bash
git add src/app/_blocks/Content/index.tsx src/app/_blocks/Content/index.module.scss
git commit -m "fix: twist animation fires late and re-fires on every intersection"
```

---

## Task 9: Refresh AOS on client-side navigation (A3)

The most severe animation defect. `AOS.init()` caches element positions once. After a client-side route change, new `data-aos` elements are never measured, and because every usage sets `data-aos-once="true"` they stay at `opacity: 0` permanently — content silently fails to appear.

**Files:**
- Modify: `src/app/_providers/AOS/index.tsx`
- Create: `src/app/_providers/AOS/index.test.tsx`

**Interfaces:**
- Consumes: `usePathname` from `next/navigation`; the file shape produced by Task 2
- Produces: `AOSWrapper` default export — signature unchanged, still `({ children }: { children: React.ReactNode })`. Task 12 modifies this same file again to add the reduced-motion predicate.

- [ ] **Step 1: Reproduce the bug first**

Start the dev server. From the home page, click a nav link to another page **without reloading**. Observe content that carries `data-aos` — for example the archive block or rich-text paragraphs.
**Expected before the fix:** at least some content is invisible or never fades in. Record which. If everything animates correctly, STOP and report — the finding does not reproduce and the fix should not be applied blind.

- [ ] **Step 2: Write the failing test**

Create `src/app/_providers/AOS/index.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AOSWrapper from './index'

const mockPathname = vi.fn()
const mockInit = vi.fn()
const mockRefreshHard = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

vi.mock('aos', () => ({
  default: {
    init: (...args: unknown[]) => mockInit(...args),
    refreshHard: () => mockRefreshHard(),
  },
}))

vi.mock('aos/dist/aos.css', () => ({}))

beforeEach(() => {
  vi.clearAllMocks()
  // rAF is what defers refreshHard until after paint; run it synchronously.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

describe('AOSWrapper', () => {
  it('initializes AOS once on mount', () => {
    mockPathname.mockReturnValue('/')
    render(<AOSWrapper><div>content</div></AOSWrapper>)
    expect(mockInit).toHaveBeenCalledTimes(1)
  })

  it('renders its children', () => {
    mockPathname.mockReturnValue('/')
    const { getByText } = render(<AOSWrapper><div>content</div></AOSWrapper>)
    expect(getByText('content')).toBeInTheDocument()
  })

  it('refreshes AOS when the pathname changes', () => {
    mockPathname.mockReturnValue('/')
    const { rerender } = render(<AOSWrapper><div>content</div></AOSWrapper>)
    mockRefreshHard.mockClear()

    mockPathname.mockReturnValue('/projects/some-project')
    rerender(<AOSWrapper><div>content</div></AOSWrapper>)

    expect(mockRefreshHard).toHaveBeenCalled()
  })

  it('does not re-initialize AOS on navigation', () => {
    mockPathname.mockReturnValue('/')
    const { rerender } = render(<AOSWrapper><div>content</div></AOSWrapper>)

    mockPathname.mockReturnValue('/posts/some-post')
    rerender(<AOSWrapper><div>content</div></AOSWrapper>)

    expect(mockInit).toHaveBeenCalledTimes(1)
  })
})
```

The fourth case guards the obvious wrong fix — calling `AOS.init()` on every route change appears to work but re-registers observers and leaks them.

- [ ] **Step 3: Run it and watch the right test fail**

Run: `yarn test src/app/_providers/AOS/index.test.tsx`
Expected: "refreshes AOS when the pathname changes" FAILS; the other three pass. That failure is precisely the production bug.

- [ ] **Step 4: Add the pathname-keyed refresh**

Replace `src/app/_providers/AOS/index.tsx`:

```tsx
'use client'
import React, { Fragment } from 'react'
import { usePathname } from 'next/navigation'
import AOS from 'aos'

import 'aos/dist/aos.css'

const AOSWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()

  React.useEffect(() => {
    AOS.init({ once: true })
  }, [])

  React.useEffect(() => {
    // A route change swaps the DOM beneath AOS, whose element positions are
    // cached at init. Without a hard refresh the new nodes are never measured,
    // and because every usage sets `data-aos-once` they stay at opacity: 0
    // permanently. rAF defers the refresh until after the new tree is painted.
    const frame = requestAnimationFrame(() => {
      AOS.refreshHard()
    })

    return () => cancelAnimationFrame(frame)
  }, [pathname])

  return <Fragment>{children}</Fragment>
}

export default AOSWrapper
```

The `requestAnimationFrame` matters: calling `refreshHard()` synchronously in the effect can run before the new subtree is laid out, re-caching stale geometry.

- [ ] **Step 5: Run the tests again**

Run: `yarn test src/app/_providers/AOS/index.test.tsx`
Expected: 4 passing.

- [ ] **Step 6: Verify**

```bash
yarn test && npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: all three exit 0.

- [ ] **Step 7: Browser check — the same journey as Step 1**

Repeat Step 1's exact navigation path.
**Pass:** every element recorded as broken in Step 1 now animates in. Then navigate back and forward twice more — animations continue to fire on each arrival.
**Fail:** any element still stranded at `opacity: 0` — report which, and whether it is inside a `Suspense` boundary or a lazily-mounted block, since that changes the fix.

- [ ] **Step 8: Commit**

```bash
git add src/app/_providers/AOS/index.tsx src/app/_providers/AOS/index.test.tsx
git commit -m "fix: refresh AOS on route change so animations survive client navigation"
```

---

## Task 10: Cap the compounding hero stagger (A4)

`data-aos-delay={500 * (i + 1)}` grows without bound. The sixth item waits three seconds, above the fold.

**Files:**
- Create: `src/app/_utilities/staggerDelay.ts`
- Create: `src/app/_utilities/staggerDelay.test.ts`
- Modify: `src/app/_heros/Revamp/index.tsx:169-192`

**Interfaces:**
- Consumes: nothing
- Produces: `staggerDelay(index: number): number` — named export from `src/app/_utilities/staggerDelay`. Pure, no DOM. Extracted to its own module specifically so it is testable without rendering the hero.

- [ ] **Step 1: Read the current delays**

```bash
sed -n '165,195p' src/app/_heros/Revamp/index.tsx
```

Expected: two `data-aos-delay` expressions, `500 * (i + 1)` and `500 * (i + 2)`.

- [ ] **Step 2: Write the failing test**

Create `src/app/_utilities/staggerDelay.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { STAGGER_MAX_MS, staggerDelay } from './staggerDelay'

describe('staggerDelay', () => {
  it('returns no delay for the first item', () => {
    expect(staggerDelay(0)).toBe(0)
  })

  it('increases with index so items feel sequenced', () => {
    expect(staggerDelay(2)).toBeGreaterThan(staggerDelay(1))
  })

  it('caps the delay so late items do not stall the hero', () => {
    expect(staggerDelay(50)).toBe(STAGGER_MAX_MS)
  })

  it('never exceeds the cap for any plausible index', () => {
    for (let i = 0; i < 200; i++) {
      expect(staggerDelay(i)).toBeLessThanOrEqual(STAGGER_MAX_MS)
    }
  })

  it('never returns a negative delay', () => {
    expect(staggerDelay(-5)).toBe(0)
  })
})
```

The negative case matters: both call sites pass `i + 1` and `i + 2`, so a future refactor passing a raw index could go negative and produce a nonsense attribute.

- [ ] **Step 3: Run it and watch it fail**

Run: `yarn test src/app/_utilities/staggerDelay.test.ts`
Expected: FAIL — cannot resolve `./staggerDelay`.

- [ ] **Step 4: Write the implementation**

Create `src/app/_utilities/staggerDelay.ts`:

```ts
/**
 * Stagger delay for sequentially revealed items, in milliseconds.
 *
 * A raw `step * index` compounds without bound: at 500ms the sixth item waits
 * three seconds while sitting above the fold. Capping keeps late items feeling
 * sequenced without stalling the hero.
 */
export const STAGGER_STEP_MS = 120
export const STAGGER_MAX_MS = 600

export const staggerDelay = (index: number): number =>
  Math.min(Math.max(index, 0) * STAGGER_STEP_MS, STAGGER_MAX_MS)
```

- [ ] **Step 5: Run the test again**

Run: `yarn test src/app/_utilities/staggerDelay.test.ts`
Expected: 5 passing.

- [ ] **Step 6: Import it in the hero**

At the top of `src/app/_heros/Revamp/index.tsx`, add:

```tsx
import { staggerDelay } from '../../_utilities/staggerDelay'
```

- [ ] **Step 7: Use it at both call sites**

Replace `data-aos-delay={500 * (i + 1)}` with:

```tsx
                  data-aos-delay={staggerDelay(i + 1)}
```

and `data-aos-delay={500 * (i + 2)}` with:

```tsx
                  data-aos-delay={staggerDelay(i + 2)}
```

- [ ] **Step 8: Verify**

```bash
yarn test && npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: all three exit 0.

- [ ] **Step 9: Browser check**

Hard-reload the home page and watch the hero resolve.
**Pass:** every hero element has finished animating within roughly a second of first paint, and the sequencing still reads as deliberate rather than simultaneous.
**Fail:** items still trickle in for multiple seconds, or all arrive at once — adjust `STAGGER_STEP_MS` only, leaving the cap and the tests intact.

- [ ] **Step 10: Commit**

```bash
git add src/app/_utilities/staggerDelay.ts src/app/_utilities/staggerDelay.test.ts src/app/_heros/Revamp/index.tsx
git commit -m "fix: cap compounding AOS stagger in hero"
```

---

## Task 11: Audit the marquee for seam gaps

Flagged as an open item in the spec: the hand-rolled `Marquee` renders five copies of its children, each running the same infinite `slide` keyframe. Whether that seams cleanly depends on content width versus viewport width. This task is **investigate first, fix only if broken.**

**Files:**
- Read: `src/app/_components/Marquee/index.module.scss`
- Modify: same file, **only if Step 1 finds a defect**

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Observe at three widths**

Load a page using the Marquee at viewport widths 1920px, 1440px and 390px. Watch each through two full 15s cycles.
Record for each: does a visible empty gap appear at the wrap point?

- [ ] **Step 2: If no gap at any width — stop**

Record the finding, make no change, and close the open item. Note the observation in the commit message of whichever task lands next. **Do not refactor a working marquee.**

- [ ] **Step 3: If a gap appears — report before fixing**

The correct fix depends on which width fails and how. Report the observation and the failing widths rather than guessing at a repair; the fix likely belongs in Phase 3 alongside the rest of the layout tokens.

---

## Task 12: Honor prefers-reduced-motion (A6)

Two infinite marquees, a shimmer, a spin, every AOS transition, and a global body transition currently run regardless of the visitor's motion preference.

**Files:**
- Create: `src/app/_utilities/prefersReducedMotion.ts`
- Create: `src/app/_utilities/prefersReducedMotion.test.ts`
- Modify: `src/app/_css/app.scss`
- Modify: `src/app/_providers/AOS/index.tsx`

**Interfaces:**
- Consumes: the `AOSWrapper` shape produced by Task 9
- Produces: `prefersReducedMotion(): boolean` — named export from `src/app/_utilities/prefersReducedMotion`. Returns `false` when `matchMedia` is unavailable, so it is safe during SSR. `AOSWrapper`'s signature stays unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/app/_utilities/prefersReducedMotion.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { prefersReducedMotion } from './prefersReducedMotion'

const stubMatchMedia = (matches: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('prefersReducedMotion', () => {
  it('is false when the visitor expressed no preference', () => {
    stubMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })

  it('is true when the visitor asked for reduced motion', () => {
    stubMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('queries the reduced-motion feature specifically', () => {
    stubMatchMedia(true)
    prefersReducedMotion()
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('returns false rather than throwing when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: undefined })
    expect(() => prefersReducedMotion()).not.toThrow()
    expect(prefersReducedMotion()).toBe(false)
  })
})
```

The last case is the one that earns its keep: AOS's `disable` predicate can be invoked in environments where `matchMedia` is missing, and a throw there would take down the whole provider.

- [ ] **Step 2: Run it and watch it fail**

Run: `yarn test src/app/_utilities/prefersReducedMotion.test.ts`
Expected: FAIL — cannot resolve `./prefersReducedMotion`.

- [ ] **Step 3: Write the implementation**

Create `src/app/_utilities/prefersReducedMotion.ts`:

```ts
/**
 * Whether the visitor has asked the OS to reduce motion.
 *
 * Returns false when `matchMedia` is unavailable (SSR, older browsers) so
 * callers can treat it as a plain predicate without guarding every call.
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

- [ ] **Step 4: Run the test again**

Run: `yarn test src/app/_utilities/prefersReducedMotion.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Disable AOS at the source**

In `src/app/_providers/AOS/index.tsx`, add the import:

```tsx
import { prefersReducedMotion } from '../../_utilities/prefersReducedMotion'
```

and change the init call to:

```tsx
  React.useEffect(() => {
    AOS.init({
      once: true,
      disable: prefersReducedMotion,
    })
  }, [])
```

AOS's own `disable` predicate is the right lever — it skips adding the animation classes entirely, rather than animating to a hidden state and leaving content invisible. This is exactly why the CSS guard in the next step must **not** blanket-disable AOS's opacity transitions: doing both risks stranding content at `opacity: 0`.

- [ ] **Step 6: Add the global CSS guard**

Append to `src/app/_css/app.scss`:

```scss
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  // AOS elements start at opacity: 0 and are revealed by a transition. With
  // transitions collapsed above, force the resting state so content cannot be
  // stranded invisible for visitors who asked for less motion.
  [data-aos] {
    opacity: 1 !important;
    transform: none !important;
  }
}
```

The `[data-aos]` override is the critical half. Collapsing transition durations alone would leave every AOS element permanently invisible — the exact bug Task 9 fixed, reintroduced through the accessibility fix.

- [ ] **Step 7: Verify**

```bash
yarn test && npx tsc --noEmit -p tsconfig.json && yarn lint
```

Expected: all three exit 0.

- [ ] **Step 8: Browser check with reduced motion forced**

In Chrome DevTools: Rendering panel → "Emulate CSS media feature prefers-reduced-motion" → `reduce`. Reload.
**Pass:** all content is visible and legible; both marquees are static; the theme toggle does not spin; no element is stuck invisible. Then navigate client-side to a second page and confirm content is visible there too.
**Fail:** any blank region — that is the AOS stranding case; confirm the `[data-aos]` block is present and not overridden by module CSS specificity.

- [ ] **Step 9: Reset the emulation and re-check normally**

Set the media feature back to "no override" and reload.
**Pass:** animations behave exactly as they did after Task 10.

- [ ] **Step 10: Commit**

```bash
git add src/app/_utilities/prefersReducedMotion.ts src/app/_utilities/prefersReducedMotion.test.ts src/app/_css/app.scss src/app/_providers/AOS/index.tsx
git commit -m "feat: honor prefers-reduced-motion across AOS, marquees and transitions"
```

---

# TRACK B — Blocked on credentials

**BLOCKED — do not start. `.env` now exists, but its `DATABASE_URI` must not be used for this track.**

Inspection on 2026-09-03 found `DATABASE_URI` pointing at `pooler.supabase.com:6543` — a hosted Supabase database that appears to be **production**, reached through the **transaction-mode pooler**. Two independent reasons Track B cannot run against it:

1. **Transaction-mode pooling breaks migrations.** Port 6543 does not hold a session across statements, so prepared statements and session-scoped DDL behave unpredictably. Payload migrations need the direct connection or the session pooler (5432), never 6543.
2. **It is live data.** Task 14 generates a baseline against the target; Task 15 drops columns and tables. Neither may point at production.

**To unblock, the site owner must provide:** a local or staging Postgres restored from a production dump, and a non-pooled connection string for it. Until then every Track B task stays unstarted.

Related: the password in that connection string was accidentally printed to the session transcript during inspection and **should be rotated**.

`.env.example` is corrected in Task 13, which is unblocked and runs with Track A.

## Task 13: Correct .env.example — UNBLOCKED, run with Track A

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing
- Produces: the documented env contract Task 14 relies on

- [ ] **Step 1: Fix the database line**

`.env.example:6` currently reads `DATABASE_URI=mongodb://127.0.0.1/payload-template-website`, which is wrong — the project runs Postgres. Replace with:

```
# Postgres connection string (this project uses @payloadcms/db-postgres)
DATABASE_URI=postgres://user:password@127.0.0.1:5432/portfolio
```

- [ ] **Step 2: Document what the GCS keys mean**

The `GCS_*` block is currently unexplained. Replace it with:

```
# Google Cloud Storage — media uploads
# GCS_KEYFILENAME is the filename inside ./keystore, not a path
GCS_BUCKET=
GCS_ENDPOINT=
GCS_PROJECT_ID=
GCS_KEYFILENAME=
```

`GCS_KEYFILENAME` is read at `payload.config.ts:33` but is entirely absent from the current example file — a genuine onboarding trap.

- [ ] **Step 3: Note the PORT dependency**

Above the existing `PORT` line, add:

```
# Required. `src/app/sitemap.ts` builds a fetch URL from this value and will
# request http://localhost:undefined if it is unset.
```

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs: correct .env.example to Postgres and document GCS keys"
```

---

## Task 14: Baseline migration and migrate scripts — BLOCKED

**Prerequisite:** a populated `.env` with a reachable `DATABASE_URI`.

**Files:**
- Modify: `package.json` (scripts block)
- Create: `src/payload/migrations/` (generated)

**Interfaces:**
- Consumes: the env contract from Task 13
- Produces: `yarn migrate`, `yarn migrate:create`, `yarn migrate:status`; a baseline migration that Task 15 builds its schema change on top of

- [ ] **Step 1: Add the scripts**

In `package.json`, alongside the existing `payload` script:

```json
    "migrate": "cross-env PAYLOAD_CONFIG_PATH=src/payload/payload.config.ts payload migrate",
    "migrate:create": "cross-env PAYLOAD_CONFIG_PATH=src/payload/payload.config.ts payload migrate:create",
    "migrate:status": "cross-env PAYLOAD_CONFIG_PATH=src/payload/payload.config.ts payload migrate:status",
    "migrate:down": "cross-env PAYLOAD_CONFIG_PATH=src/payload/payload.config.ts payload migrate:down",
```

- [ ] **Step 2: Pin the adapter (O3)**

`@payloadcms/db-postgres` is specified as `^0.x` and resolves to 0.8.9. Pin it exactly:

```bash
yarn add @payloadcms/db-postgres@0.8.9 --exact
```

- [ ] **Step 3: Generate the baseline against a scratch database**

Do **not** run this against production. Point `DATABASE_URI` at a local database restored from a production dump, then:

```bash
yarn migrate:create baseline
```

- [ ] **Step 4: Prove the round trip**

```bash
yarn migrate:status
yarn migrate
yarn migrate:status
yarn migrate:down
yarn migrate:status
```

Expected: status reports the baseline pending, then applied, then reverted. **This round trip is Phase 0's exit criterion.** If `migrate:down` fails, stop — Task 15 must not proceed without a working rollback.

- [ ] **Step 5: Commit**

```bash
git add package.json yarn.lock src/payload/migrations
git commit -m "feat: add Postgres migration scripts and baseline migration"
```

---

## Task 15: Remove premiumContent and the Comments collection — BLOCKED

**Prerequisite:** Task 14 complete, with a verified `migrate:down`. **Prerequisite:** Task 5 complete, so no front-end code references either.

**Files:**
- Modify: `src/payload/collections/Posts/index.ts:126-140`
- Modify: `src/payload/payload.config.ts` (imports and `collections` array)
- Delete: `src/payload/collections/Comments/` (whole directory)
- Create: a generated migration
- Modify: `src/payload/payload-types.ts` (regenerated)

**Interfaces:**
- Consumes: the migration tooling from Task 14
- Produces: a `Post` type with no `enablePremiumContent` or `premiumContent`; a config with no `comments` collection

- [ ] **Step 1: Back up first**

```bash
pg_dump "$DATABASE_URI" > ../portfolio-pre-phase1.sql
```

This drops content tables. The dump is not optional.

- [ ] **Step 2: Remove the fields**

In `src/payload/collections/Posts/index.ts`, delete the `enablePremiumContent` checkbox field and the `premiumContent` blocks field, leaving the surrounding `layout` field and tab structure intact.

- [ ] **Step 3: Remove the collection**

```bash
git rm -r src/payload/collections/Comments
```

In `src/payload/payload.config.ts`, delete the `import Comments from './collections/Comments'` line and remove `Comments` from the `collections` array, leaving `[Pages, Posts, Projects, Media, Categories, Users, Stacks]`.

**Do not touch `Users` in that array.** It backs the admin login.

- [ ] **Step 4: Regenerate types**

```bash
yarn generate:types
```

- [ ] **Step 5: Generate and inspect the migration**

```bash
yarn migrate:create remove-premium-content-and-comments
```

**Read the generated SQL before running it.** Confirm it drops only the `comments` tables and the `premium_content` / `enable_premium_content` columns on posts. If it proposes dropping anything else — particularly any `users` table — STOP and report.

- [ ] **Step 6: Apply and verify the round trip**

```bash
yarn migrate
yarn migrate:status
```

- [ ] **Step 7: Verify the build and the admin panel**

```bash
npx tsc --noEmit -p tsconfig.json && yarn lint && yarn build:payload
```

Then in the browser: `/admin` still logs in; the dashboard lists seven collections with **no** Comments; opening a Post shows no premium-content fields; the public post page renders correctly.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: remove premiumContent field and Comments collection

Ships with a reversible migration. The Payload admin panel and Users
collection are untouched."
```

---

## Task 16: Retire the Slate editor stack (F6) — BLOCKED

**Prerequisite:** Task 14 complete.

**The spec understates this one.** "Delete `payload/fields/richText/`" is the easy half. The hard half is that `Media.caption` is a `richText` field using `slateEditor`, and Slate and Lexical store **structurally different JSON**. Switching the editor does not convert existing captions — it orphans them, and the admin panel will render empty caption fields over data that is still in the database.

**Files:**
- Modify: `src/payload/collections/Media.ts:1,20-27`
- Delete: `src/payload/fields/richText/` (whole directory)
- Modify: `package.json`
- Create: a data migration, **only if Step 1 finds captions**

**Interfaces:**
- Consumes: the migration tooling from Task 14
- Produces: a single-editor config — `lexicalEditor` only, with the duplicate `label` / `largeBody` implementations reduced to the `lexicalFeatures` copies

- [ ] **Step 1: Find out whether any caption data actually exists**

```bash
psql "$DATABASE_URI" -c "SELECT COUNT(*) FROM media WHERE caption IS NOT NULL;"
```

This determines which branch you are on, and it is the whole decision.

- [ ] **Step 2a: If the count is 0 — take the simple path**

No data to convert. In `src/payload/collections/Media.ts`, remove the `slateEditor` import and delete the entire `editor: slateEditor({ … })` block from the `caption` field, letting it inherit the config-level `lexicalEditor`. Then:

```bash
git rm -r src/payload/fields/richText
yarn remove @payloadcms/richtext-slate slate
yarn generate:types
```

- [ ] **Step 2b: If the count is greater than 0 — STOP and report**

Do not convert Slate JSON to Lexical JSON by hand or by improvisation. Report the row count and a sample caption, and treat the conversion as its own scoped piece of work. Options, in rough order of preference: re-enter the captions manually if there are only a handful; write a one-off transform script covering only the node types actually present in the data; or keep Slate solely for `Media.caption` and still delete the duplicate `label` / `largeBody` implementations, which is most of the F6 benefit at none of the risk.

**Do not proceed past this step on your own judgment.** Silent data loss is the failure mode.

- [ ] **Step 3: Confirm no Slate references survive (path 2a only)**

```bash
grep -rn "richtext-slate\|slateEditor\|fields/richText" src --include=*.ts --include=*.tsx
```

Expected: no output.

- [ ] **Step 4: Verify (path 2a only)**

```bash
npx tsc --noEmit -p tsconfig.json && yarn lint && yarn build:payload
```

Expected: all three exit 0.

Then in the browser: `/admin` → Media → open an item and confirm the caption field renders as a Lexical editor. Open a Post and confirm the rich-text editor still offers the custom **Label** and **Large Body** controls — those come from `lexicalFeatures`, which this task does not touch.

- [ ] **Step 5: Commit (path 2a only)**

```bash
git add -A
git commit -m "refactor: retire Slate editor, consolidate on Lexical"
```

---

## Completion criteria

Track A is done when: `tsc`, `lint` and `build:payload` all pass; `/admin` logs in and reaches the dashboard; the public nav is visible on first paint with no flash; every animation fires on scroll and survives client-side navigation; and forcing `prefers-reduced-motion: reduce` leaves no content invisible.

Track B is done when: `yarn migrate` and `yarn migrate:down` both round-trip cleanly; the admin dashboard lists seven collections with no Comments; and Task 16 has either completed via path 2a or been formally deferred via path 2b with the caption row count recorded.

**Deliberately out of scope:** every finding assigned to Phases 3, 4 and 5 — brand tokenization, caching, CSP, image sizes, and accessibility. Do not opportunistically fix them here, even when adjacent code makes it tempting. The one exception is the explanatory comment in Task 8 Step 3, which documents a Phase 3 item without changing behaviour.
