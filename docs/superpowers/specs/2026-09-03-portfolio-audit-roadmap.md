# Portfolio Site — Audit & Roadmap

**Date:** 2026-09-03
**Repo:** `druloloy-payload` (portfolio)
**Stack:** Payload 2.30.3 · Next 13.5.2 · Postgres (`@payloadcms/db-postgres` 0.8.9) · GCS media · Express + pm2

---

## 1. Context

The site is a fork of the official Payload website template with a neobrutalist visual
identity layered on top. Two things follow from that origin and shape everything below:

1. **The template's membership machinery is still wired in** — login, account, password
   reset, `AuthProvider`, `PremiumContent`, and `Comments` are all live code, but
   `Users.create` is admin-only, so no visitor can ever obtain an account. It is a locked
   door with a fully furnished lobby behind it.
2. **The brand exists in the components, not in the design system.** The neobrutalist
   language — hard borders, offset shadows, the three accents, uppercase Space Grotesk —
   is hand-copied into individual `.module.scss` files with drifting values, while
   `theme.scss` holds 246 lines of an inherited grayscale elevation ramp the design
   barely touches.

### Decisions taken

| Decision | Choice |
|---|---|
| Platform | **Stay on Payload 2.** Payload 3 / Next 15 documented as a deferred phase. |
| Auth stack | **Remove**, with one carve-out (see Phase 1). |
| Design scope | **Tokenize and reconcile drift.** Some components shift slightly from today. |
| Brand values | **Preserved exactly** — colors, type scale, border/shadow language are inputs, not open questions. |
| Reported symptoms | Design inconsistencies and animation bugs — Phases 2 and 3 carry these. |

### Sequencing rationale

Demolition precedes design because tokenizing components that are about to be deleted is
wasted work: Phase 1 removes 44 of 257 source files (17%) and touches 8 more. Migrations
precede demolition because removing `PremiumContent` and `Comments` alters the Postgres
schema, and there is currently no way to roll that back.

---

## 2. Findings

Severity: **P0** breaks the site for real visitors · **P1** visible defect or material risk ·
**P2** maintainability and hygiene.

### 2.1 Animation defects — the reported symptom

| ID | Sev | Finding | Location |
|---|---|---|---|
| A1 | P1 | `transform: translateX(100)` — unitless value, browser discards the declaration. The `from` keyframe of the hero tech ticker is dropped, so it starts at its resting position and hard-pops back each 20s cycle instead of scrolling seamlessly. | `_heros/Revamp/index.module.scss:156` |
| A2 | P1 | `twistRight` / `twistLeft` **are** scroll-triggered by an `IntersectionObserver`, but three things defeat it: `animation-delay: 1s` runs *after* intersection, so the element sits still for a second once already visible; the observer uses the default `threshold: 0` and fires at 1px of visibility, compounding the delay; and it never unobserves, re-adding the class on every intersection. Separately, the whole effect is gated on `blockName !== 'work_exp'` — a magic string matched against a **CMS-authored block name**, so renaming that block in the admin panel silently kills the animation. | `_blocks/Content/index.tsx:21-56`, `index.module.scss:149-166` |
| A3 | P0 | `AOS.init()` runs once in a root-layout `useEffect` and is never refreshed. On client-side navigation, new `data-aos` elements enter with AOS's position cache stale; because every usage sets `data-aos-once="true"`, they remain at `opacity: 0` **permanently**. Content can simply fail to appear after in-app navigation. | `_providers/AOS/index.tsx:13` |
| A4 | P1 | `data-aos-delay={500 * (i + 1)}` compounds linearly — the 6th hero item waits 3 seconds, above the fold. | `_heros/Revamp/index.tsx:172,188` |
| A5 | P2 | GSAP + `ScrollTrigger` imported and registered in the root layout; zero animations use them. `react-gsap` installed, zero imports. | `_providers/AOS/index.tsx:4-7` |
| A6 | P1 | No `prefers-reduced-motion` handling anywhere, across two infinite marquees, a shimmer, a spin, and every AOS transition. | project-wide (0 occurrences) |
| A7 | P2 | Dead hover state: `.technology_wrapper:hover { opacity: 1 }` while the base `opacity: 0.3` is commented out — the hover changes nothing. | `_heros/Revamp/index.module.scss:113,127` |
| A8 | P1 | `.technologies` hardcodes `background-color: black` with `mix-blend-mode: difference`, inverting its meaning between light and dark themes. | `_heros/Revamp/index.module.scss:136-138` |

### 2.2 Correctness

| ID | Sev | Finding | Location |
|---|---|---|---|
| C1 | P0 | Database category IDs hardcoded in a component: `const categories = [21, 20, 19]`. Breaks against any database where those IDs differ — including a fresh restore of your own. | `_heros/Revamp/index.tsx:51` |
| C2 | P0 | The entire nav is hidden until an authenticated fetch resolves (`user === undefined && classes.hide`) — an invisible header on every cold load, gating on an auth system no visitor can use. | `_components/Header/Nav/index.tsx:19` |
| C3 | P1 | `html { opacity: 0 }` until an inline `beforeInteractive` script sets `data-theme`. Any failure or delay of that script yields a blank page. | `_css/app.scss:31-39` |
| C4 | P1 | Missing `return` on the preview auth guard — `new Response(...)` is constructed and discarded, execution falls through. | `next/preview/route.ts:27` |
| C5 | P1 | `generateStaticParams` returns an array of strings where Next expects `{ slug }` objects. Present in all three dynamic routes. | `[slug]`, `posts/[slug]`, `projects/[slug]` |
| C6 | P1 | `sitemap.ts` fetches `http://localhost:${process.env.PORT}` — resolves to `localhost:undefined` when `PORT` is unset. | `app/sitemap.ts:5` |
| C9 | P1 | **A Project block placed on a Page renders empty.** `_graphql/pages.ts` omits `PROJECT_BLOCK` from its `layout` selection, while `collections/Pages/index.ts:69` does allow `ProjectBlock` — so the query returns the block with a `blockType` but none of its fields. Verified by cross-referencing all three collections' block lists against all three queries: Posts and Projects are correct; only Pages has the gap. Also in both `pages.ts` and `posts.ts`, `${CONTENT}` is spread twice in the same selection — harmless, since GraphQL merges identical spreads, but sloppy. Found during Phase 1 execution on 2026-09-03; pre-existing, not introduced by that work. | `_graphql/pages.ts` vs `collections/Pages/index.ts:69` |
| C7 | P2 | Open redirect: `redirect(url)` on an unvalidated `searchParams` value. Gated behind a valid token and secret, so exploitation requires an authenticated editor — but the validation is free. | `next/preview/route.ts` |
| C8 | P2 | `.env.example` still documents `DATABASE_URI=mongodb://...` while the project runs Postgres. | `.env.example:6` |

### 2.3 Performance & delivery

| ID | Sev | Finding | Location |
|---|---|---|---|
| F1 | P0 | ~~`cache: 'no-store'` on every fetch meant 3–4 uncached Postgres round trips per page view, so a handful of reloads exhausted the connection limit and the site 404'd (`fetchDoc` swallows the error, so it never surfaces as a 5xx).~~ **FIXED 2026-09-05 (4f899f9).** Published reads now use the Data Cache with tags + a 300s backstop; drafts keep `no-store`. `force-dynamic` was deliberately kept — it sets `forceDynamic` but never `fetchCache`, so pages still render per request while their data is cached. Measured: ~150–230ms warm with zero queries, vs ~1700ms after a tag bust. | `_api/fetch*.ts` |
| F1a | P0 | ~~**On-demand revalidation never worked at all.** `/next/revalidate` compared the secret against `NEXT_PRIVATE_REVALIDATION_KEY`; every caller sent `REVALIDATION_KEY`. Both are set and hold *different* values, so every publish got a 400, logged via `${res}` — which stringifies to `[object Response]`, hiding the status. Discovered while fixing F1; enabling caching without this would have frozen the site permanently.~~ **FIXED 2026-09-05 (4f899f9)**, both sides now read one accessor. | `utilities/revalidate.ts`, `next/revalidate/route.ts` |
| F1b | P0 | ~~Globals had **no** revalidation path, and `fetchFooter` was already cached indefinitely with no tag — the footer could never be updated without a redeploy.~~ **FIXED 2026-09-05 (4f899f9)**: tags + `afterChange` hooks on all three globals. | `_api/fetchGlobals.ts`, `payload/globals/` |
| F1c | P1 | All three `generateStaticParams` return `string[]` where Next expects `{ slug }[]`. Dormant only because `force-dynamic` stops static generation being attempted. **Must be fixed before anyone removes `force-dynamic`.** | 3 route files |
| F2 | P0 | CSP `img-src` allows only `'self'` and `raw.githubusercontent.com` — the GCS bucket serving your media is absent. `next.config.js` `images.domains` omits it too. | `csp.js:17`, `next.config.js:8` |
| F3 | P1 | No `imageSizes` on the Media collection — every CMS image is served at full resolution to every device. | `collections/Media.ts:5` |
| F4 | P2 | CSP `script-src` carries both `'unsafe-inline'` and `'unsafe-eval'`, which negates most of the XSS protection the header is there to provide. | `csp.js:5-7` |
| F5 | P2 | Unused dependencies shipped: `react-router-dom`, `react-gsap`, `react-fast-marquee` (the Marquee is hand-rolled). | `package.json` |
| F6 | P2 | Slate and Lexical are both live. `label` and `largeBody` custom features are implemented **twice**, once per editor. | `payload/fields/richText/` vs `payload/fields/lexicalFeatures/` |

### 2.4 Design system

| ID | Sev | Finding |
|---|---|---|
| D1 | P1 | **Two competing type systems**: the template's fixed-px `%h1`–`%h6` scale in `type.scss`, and the blocks' fluid `max(48px, 4vw)` clamps. Headings resolve differently depending on which system wins. |
| D2 | P1 | `--font-body: system-ui` in `app.scss:8` despite Work Sans being loaded via `next/font` — the body font never applies globally. `Input` hardcodes `system-ui` too. `--font-mono: 'Roboto Mono'` is referenced but never loaded. |
| D3 | P1 | Border-weight drift: `1px`, `2px`, and `4px` solid borders all used for the same neobrutalist intent across components. |
| D4 | P1 | Dark-mode leaks: `StackCard` shadow uses `--color-secondary` (fixed) instead of `--theme-color-secondary`; `Content` block hardcodes `background-color: #fff`. |
| D5 | P2 | `theme.scss` is 246 lines of a 21-step grayscale elevation ramp the neobrutalist design barely uses. The actual brand tokens are five lines at the bottom of `colors.scss`. |
| D6 | P2 | Inconsistent component treatment: `Button` carries the full brutalist border + offset shadow; `Card` has its border commented out entirely. |
| D7 | P2 | Hover states are bare `scale: 1.1` with `transition: all 300ms`, rather than the shadow/translate interplay the style implies. |

### 2.5 Operations

| ID | Sev | Finding |
|---|---|---|
| O5 | P0 | **The repository cannot `yarn install` from its own committed lockfile.** `@payloadcms/db-postgres@0.8.9` hard-pins `drizzle-kit@0.23.2-df9e596`, a snapshot build that has since been unpublished from the registry — it 404s. A clean checkout is dead on arrival. Found during execution setup on 2026-09-03, not in the original audit pass. Fixed under Ruling R3 via a `resolutions` entry pinning the published `0.23.2`. |
| O1 | P0 | **No Postgres migrations and no `migrate` script.** Production schema state is undefined and there is no rollback path. |
| O2 | P1 | No tests of any kind — no runner configured, no test files. |
| O3 | P2 | `@payloadcms/db-postgres` pinned as `^0.x`, an extremely loose pre-1.0 range, resolving to 0.8.9. |
| O4 | P2 | `redirects.js` still ships an Internet Explorer redirect; the non-www rule uses a broad host regex worth re-verifying for loop risk. |

---

## 3. Roadmap

### Phase 0 · Safety net — ½ day

Nothing ships before there is a way to roll a schema back.

- Add `migrate`, `migrate:create`, `migrate:status` scripts; generate the baseline migration from current schema (O1).
- Correct `.env.example` — Postgres URI, document `GCS_*`, `PORT`, `NEXT_PUBLIC_IS_LIVE` (C8).
- Pin `@payloadcms/db-postgres` to an exact version (O3).
- Write a manual smoke checklist: home, a project, a post, admin login, preview mode, image load.

**Exit:** a migration can be applied and reverted against a local database.
**Needs from you:** `DATABASE_URI` and GCS credentials in `.env`.

### Phase 1 · Demolition — 1 day

Deletes bugs rather than fixing them. 44 files removed, 8 edited.

- Delete `_login`, `account`, `logout`, `recover-password`, `reset-password`, `PremiumContent`, `_blocks/Comments`, `collections/Comments`, `_api/fetchComments.ts`, `_api/getMe.ts`, `_utilities/getMeUser.ts`.
- Remove the `premiumContent` field from `Posts` → **schema change, ships with a migration** (Phase 0 dependency).
- **Carve-out:** `AdminBar` depends on `useAuth` and is worth keeping as the inline-edit affordance. Replace the 218-line, seven-method `AuthProvider` with a ~30-line read-only `useAdminUser()` hook that fetches `/api/users/me` once, consumed only by `AdminBar`.
- **This closes C2 for free** — `Nav` no longer gates visibility on `user === undefined`.
- Remove `react-router-dom`, `react-gsap`, `react-fast-marquee`, `gsap` + `ScrollTrigger` registration (A5, F5).
- Retire the Slate stack: migrate `Media.caption` to Lexical, delete `payload/fields/richText/` (F6). Regenerate `payload-types.ts`.

**Exit:** clean build, no auth routes reachable, nav visible immediately on cold load, AdminBar still functions for admins.

### Phase 2 · Animation repair — 1–2 days

- **A3:** re-init AOS on route change — `AOS.refreshHard()` keyed to `usePathname()`. Verify by navigating between pages client-side and confirming no element remains at `opacity: 0`.
- **A2:** move `twistRight`/`twistLeft` to scroll-triggered (`data-aos` or an `IntersectionObserver`), replacing the load-time delay.
- **A1:** `translateX(100)` → `translateX(100%)`.
- **A4:** cap stagger — `min(500 * (i + 1), 1200)` or a shorter base interval.
- **A6:** global `@media (prefers-reduced-motion: reduce)` guard disabling AOS, both marquees, shimmer, spin, and the theme transition.
- **A7, A8:** resolve the dead hover state; replace `black` + `mix-blend-mode` with theme-aware tokens.
- Audit the hand-rolled 5-copy Marquee for seam gaps at wide viewports.

**Exit:** every animation fires when scrolled into view, survives client-side navigation, and is fully suppressed under reduced-motion.

### Phase 3 · Brand tokenization — 2–3 days

Brand values are **preserved exactly**; what changes is where they live and the drift between them.

- Create `_css/_brand.scss` as the single source: border weight scale, hard-shadow offset, the three accents (`#FDFD96` / `#9696FD` / `#FD96CA`), primary/secondary, type scale, motion durations.
- Delete the unused elevation ramp from `theme.scss`, keeping only what components actually reference (D5).
- **D1:** collapse the two type systems into one fluid scale; remove the competing `%h1`–`%h6` px definitions.
- **D2:** `--font-body` → Work Sans; remove hardcoded `system-ui` from `Input`; either load or drop `--font-mono`.
- **D3:** reconcile 1px/2px/4px to a defined scale. *This is where components visibly shift — the "fix inconsistencies" you chose.*
- **D4:** fix both dark-mode leaks.
- **D6, D7:** bring `Card` up to the same standard as `Button`; replace bare `scale: 1.1` hovers with the shadow/translate interplay the style implies.

**Exit:** no hardcoded brand value outside `_brand.scss`; light and dark both correct on every page.

### Phase 4 · Correctness & performance — 2 days

- **C1:** hardcoded category IDs → CMS-driven (a relationship field on the hero, or query by slug).
- **F1:** `force-dynamic` → tag-based ISR, which makes the already-built `revalidateTag` hooks and `/next/revalidate` endpoint actually function. The single largest performance win available.
- **F2:** add the GCS bucket to CSP `img-src` and `next.config.js` `images.domains`; prefer `resource.url` over the reconstructed `/media/` path.
- **F3:** add `imageSizes` to Media; backfill existing uploads.
- **C4, C5, C6, C7:** the missing `return`, `generateStaticParams` shape, sitemap URL, preview redirect validation.
- **C3:** replace the `opacity: 0` blank-page gamble with a no-JS-safe default theme.
- **F4:** tighten `script-src` — nonce or hash the theme script, drop `unsafe-eval` if GTM permits.
- **O4:** remove the IE redirect; re-verify the non-www rule.

**Exit:** Lighthouse performance measured before and after; cached pages serve without a database round-trip; CMS images load under CSP.

### Phase 5 · Accessibility — 1–2 days

Starting point is near zero: 3 `aria-*` attributes site-wide, no `:focus-visible`, `outline: none` in global link styles.

- `:focus-visible` treatment as a first-class brand token — a neobrutalist focus ring is an asset, not a compromise.
- Restore focus outlines removed in `app.scss`.
- Keyboard access and focus trapping for the gallery modal and theme selector.
- Enforce alt text (already `required` on Media — verify it reaches the rendered `<img>`).
- Contrast audit of the three accents against both themes.
- Landmarks and heading order.

**Exit:** keyboard-navigable end to end; axe clean on home, a project, and a post.

### Deferred · Payload 3 + Next 15

Not scheduled. Scoped so it can be triggered deliberately:

Payload 3 folds the CMS into the Next app router — the custom Express server and `pm2.json` disappear, `payload.config.ts` changes shape, React 19 and Next 15 come with their own migration surface, and the database layer moves. Phases 0–5 all reduce the work: fewer files, no Slate, no auth stack, real migrations, and a tokenized design system that ports cleanly.

---

## 4. Sequence at a glance

| Phase | Focus | Effort | Depends on |
|---|---|---|---|
| 0 | Safety net | ½ day | credentials |
| 1 | Demolition | 1 day | Phase 0 (schema change) |
| 2 | Animation repair | 1–2 days | Phase 1 (fewer files) |
| 3 | Brand tokenization | 2–3 days | Phases 1–2 |
| 4 | Correctness & performance | 2 days | Phase 0 |
| 5 | Accessibility | 1–2 days | Phase 3 (focus tokens) |

**Total: 8–11 working days.**

Phase 4 depends only on Phase 0 and can run in parallel with 2–3 if the work is split.

## 5. Open items

- Marquee seam behaviour at wide viewports needs visual confirmation in a browser (Phase 2).
- GCS asset URL shape needs confirmation against the live bucket before finalizing the F2 fix — inferred from config, not yet observed.
- No test strategy is proposed here. With zero tests today, the honest sequence is to land Phases 0–2 with the manual smoke checklist, then decide whether the site warrants a test suite. Flagged as O2 rather than scheduled.
