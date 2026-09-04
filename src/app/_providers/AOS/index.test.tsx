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
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
    cb(0)
    return 1
  }))
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
    expect(global.requestAnimationFrame).toHaveBeenCalled()
  })

  it('does not re-initialize AOS on navigation', () => {
    mockPathname.mockReturnValue('/')
    const { rerender } = render(<AOSWrapper><div>content</div></AOSWrapper>)

    mockPathname.mockReturnValue('/posts/some-post')
    rerender(<AOSWrapper><div>content</div></AOSWrapper>)

    expect(mockInit).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending refresh frame when the pathname changes again', () => {
    mockPathname.mockReturnValue('/')
    const { rerender, unmount } = render(<AOSWrapper><div>content</div></AOSWrapper>)

    mockPathname.mockReturnValue('/posts/first')
    rerender(<AOSWrapper><div>content</div></AOSWrapper>)

    mockPathname.mockReturnValue('/posts/second')
    rerender(<AOSWrapper><div>content</div></AOSWrapper>)

    // Each pathname change schedules a frame and must cancel the previous one,
    // so a rapid navigation cannot leave a stale refresh queued against a DOM
    // that has already been replaced again.
    expect(global.cancelAnimationFrame).toHaveBeenCalled()

    unmount()
  })
})
