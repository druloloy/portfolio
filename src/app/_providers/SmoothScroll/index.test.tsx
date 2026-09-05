import React from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockResize = vi.fn()
const mockDestroy = vi.fn()
const mockOn = vi.fn()
const mockRefresh = vi.fn()
const mockAddEventListener = vi.fn()
const mockPrefersReducedMotion = vi.fn()

vi.mock('lenis', () => ({
  default: class {
    on = mockOn
    resize = mockResize
    destroy = mockDestroy
    scrollTo = vi.fn()
  },
}))

vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() },
  },
}))

vi.mock('gsap/dist/ScrollTrigger', () => ({
  ScrollTrigger: {
    update: vi.fn(),
    refresh: (...args: unknown[]) => mockRefresh(...args),
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
    removeEventListener: vi.fn(),
  },
}))

vi.mock('../../_utilities/prefersReducedMotion', () => ({
  prefersReducedMotion: () => mockPrefersReducedMotion(),
}))

// eslint-disable-next-line import/first
import { SmoothScrollProvider } from './index'

type ObserverCallback = () => void

let observed: Element[] = []
let triggerResize: ObserverCallback = () => {}

class MockResizeObserver {
  constructor(callback: ObserverCallback) {
    triggerResize = callback
  }
  observe(el: Element): void {
    observed.push(el)
  }
  disconnect(): void {}
}

// jsdom always reports scrollHeight as 0, so drive it explicitly: the provider
// must only re-measure when the height has genuinely changed.
const setScrollHeight = (value: number): void => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value,
    configurable: true,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  observed = []
  mockPrefersReducedMotion.mockReturnValue(false)
  setScrollHeight(1000)
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: FrameRequestCallback) => {
      cb(0)
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

describe('SmoothScrollProvider', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <SmoothScrollProvider>
        <div>content</div>
      </SmoothScrollProvider>,
    )
    expect(getByText('content')).toBeInTheDocument()
  })

  // The regression this guards: Lenis observes `document.documentElement` for
  // content changes, but app.scss pins it to `height: 100%`, so that observer
  // can never fire. Lenis keeps its initial scroll limit and clamps scrolling
  // short of the bottom. The body's children carry the real content height.
  it('observes the body children, not the documentElement', () => {
    render(
      <SmoothScrollProvider>
        <div>content</div>
      </SmoothScrollProvider>,
    )

    expect(observed.length).toBeGreaterThan(0)
    expect(observed).not.toContain(document.documentElement)
    observed.forEach(el => expect(el.parentElement).toBe(document.body))
  })

  it('re-measures Lenis when the document height changes', () => {
    render(
      <SmoothScrollProvider>
        <div>content</div>
      </SmoothScrollProvider>,
    )
    mockResize.mockClear()
    mockRefresh.mockClear()

    setScrollHeight(2000)
    triggerResize()

    expect(mockResize).toHaveBeenCalled()
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('does not re-measure when the height is unchanged', () => {
    render(
      <SmoothScrollProvider>
        <div>content</div>
      </SmoothScrollProvider>,
    )
    mockResize.mockClear()

    triggerResize()

    expect(mockResize).not.toHaveBeenCalled()
  })

  it('never starts Lenis under reduced motion', () => {
    mockPrefersReducedMotion.mockReturnValue(true)
    render(
      <SmoothScrollProvider>
        <div>content</div>
      </SmoothScrollProvider>,
    )
    expect(mockOn).not.toHaveBeenCalled()
  })
})
