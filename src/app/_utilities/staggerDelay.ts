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
