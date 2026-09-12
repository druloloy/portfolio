'use client'

import React from 'react'

import { Header as HeaderType } from '@/payload/payload-types'
import { ThemeSelector } from '../../../_providers/Theme/ThemeSelector'
import Icon from '../../Icon'
import { CMSLink } from '../../Link'

import classes from './index.module.scss'

export const HeaderNav: React.FC<{ header: HeaderType }> = ({ header }) => {
  const navItems = header?.navItems || []

  return (
    <nav className={classes.nav}>
      <a href="/">
        <Icon name="FaHouseChimney" />
      </a>
      {navItems.map(({ link }, i) => {
        return <CMSLink key={i} {...link} appearance="none" />
      })}
      <ThemeSelector />
    </nav>
  )
}
