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
