'use client'

import React from 'react'

import { SmoothScrollProvider } from './SmoothScroll'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <SmoothScrollProvider>{children}</SmoothScrollProvider>
    </ThemeProvider>
  )
}
