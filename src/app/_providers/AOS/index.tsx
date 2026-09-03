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
