'use client'

import React, { useCallback } from 'react'

import { Chevron } from '../../../_components/Chevron'
import Icon from '../../../_components/Icon'
import { useTheme } from '..'
import { getImplicitPreference } from '../shared'
import { Theme, themeLocalStorageKey } from './types'

import classes from './index.module.scss'

export const ThemeSelector: React.FC = () => {
  const { setTheme } = useTheme()
  const [themeState, setThemeState] = React.useState<Theme | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const preference = window.localStorage.getItem(themeLocalStorageKey)
    if (preference) setThemeState(preference as Theme)
  }, [])

  const fireAfterSeconds = useCallback((seconds: number, callback: () => void) => {
    setTimeout(() => {
      callback()
    }, seconds * 1000)
  }, [])

  const toggleTheme = () => {
    if (themeState === 'light') {
      fireAfterSeconds(0.25, () => {
        setThemeState('dark')
        setTheme('dark')
      })
    } else {
      fireAfterSeconds(0.25, () => {
        setThemeState('light')
        setTheme('light')
      })
    }

    if (ref.current) {
      ref.current.classList.add(classes.spin)

      fireAfterSeconds(0.5, () => {
        if (ref.current) ref.current.classList.remove(classes.spin)
      })
    }
  }

  return (
    <div
      ref={ref}
      onClick={toggleTheme}
      className={[classes.themeSelector].filter(Boolean).join(' ')}
    >
      <label htmlFor="theme">
        {themeState === 'light' ? <Icon name="FaSun" /> : <Icon name="FaMoon" />}
      </label>
    </div>
  )
}
