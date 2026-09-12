'use client'
import React from 'react'

import { useSmoothScroll } from '../../_providers/SmoothScroll'
import Icon from '../Icon'

import classes from './index.module.scss'

export const ScrollUp = () => {
  const [visible, setVisible] = React.useState(false)
  const thresholdValue = 1000
  const { scrollTo } = useSmoothScroll()
  React.useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > thresholdValue) {
        setVisible(true)
      } else {
        setVisible(false)
      }
    }

    window.addEventListener('scroll', onScroll)

    return () => window.removeEventListener('scroll', onScroll)
  }, [thresholdValue])

  const onClick = () => {
    // Routes through Lenis when it is active; the context falls back to a
    // native smooth scroll when it is not (reduced motion), so no branch here.
    scrollTo(0)
  }

  return (
    <div
      className={classes.scrollUp}
      style={{ display: visible ? 'block' : 'none' }}
      onClick={onClick}
    >
      <span>
        <Icon name="FaArrowUp" />
      </span>
    </div>
  )
}
