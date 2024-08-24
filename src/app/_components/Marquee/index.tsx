import React, { Fragment } from 'react'

import classes from './index.module.scss'

const Marquee: React.FC<{ children: React.ReactNode; reverse?: boolean }> = ({
  children,
  reverse,
}) => {
  return (
    <section className={classes.marquee}>
      {Array.from({ length: 5 }).map((item, index) => (
        <section
          key={index}
          aria-hidden={index > 0}
          className={[classes.marquee__items, reverse ? classes.reverse : ''].join(' ')}
        >
          {children}
        </section>
      ))}
    </section>
  )
}

export default Marquee
