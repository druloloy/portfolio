'use client'

import React from 'react'
import Link from 'next/link'

import { Header as HeaderType } from '../../../../payload/payload-types'
import { useAuth } from '../../../_providers/Auth'
import { ThemeSelector } from '../../../_providers/Theme/ThemeSelector'
import Icon from '../../Icon'
import { CMSLink } from '../../Link'

import classes from './index.module.scss'

export const HeaderNav: React.FC<{ header: HeaderType }> = ({ header }) => {
  const navItems = header?.navItems || []
  const { user } = useAuth()

  return (
    <nav className={[classes.nav, user === undefined && classes.hide].filter(Boolean).join(' ')}>
      <a href="/">
        <Icon name="FaHouseChimney" />
      </a>
      {navItems.map(({ link }, i) => {
        return <CMSLink key={i} {...link} appearance="none" />
      })}
      {/* {user && <Link href="/account">Account</Link>} */}
      <ThemeSelector />
    </nav>
  )
}
