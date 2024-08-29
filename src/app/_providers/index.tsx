'use client'

import React from 'react'

import { AuthProvider } from '../_providers/Auth'
import { ThemeProvider } from './Theme'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  React.useEffect(() => {
    window.addEventListener('load', () => {
      // @ts-ignore
      window.dataLayer = window.dataLayer || []
      // @ts-ignore
      window.dataLayer.push({
        event: 'page_view',
      })
    })
  }, [])

  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
