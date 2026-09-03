import { vi } from 'vitest'

import '@testing-library/jest-dom/vitest'

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
