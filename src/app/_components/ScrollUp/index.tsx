'use client'
import React from 'react'

import Icon from '../Icon'

import classes from './index.module.scss'

export const ScrollUp = () => {
  const [visible, setVisible] = React.useState(false)
  const thresholdValue = 1000
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
