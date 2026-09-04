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
