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
