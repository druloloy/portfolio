import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { Gutter } from '../../Gutter'
import { HeaderNav } from '../Nav'

import type { Header } from '@/payload/payload-types'

import classes from './index.module.scss'

const HeaderComponent = ({ header }: { header: Header }) => {
  return (
    <nav className={classes.header}>
      <Gutter>
        {/* <Link href="/">
          <Image
            src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/payload/src/admin/assets/images/payload-logo-dark.svg"
            alt="Payload Logo"
            width={150}
            height={40}
          />
        </Link> */}
        <HeaderNav header={header} />
      </Gutter>
    </nav>
  )
}

export default HeaderComponent
