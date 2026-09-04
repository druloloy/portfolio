import React, { Fragment } from 'react'

import classes from './index.module.scss'

const Marquee: React.FC<{ children: React.ReactNode; reverse?: boolean }> = ({
  children,
  reverse,
}) => {
  return (
    <section className={classes.marquee}>
      <div className={[classes.track, reverse ? classes.reverse : ''].filter(Boolean).join(' ')}>
        {Array.from({ length: 5 }).map((item, index) => (
          <section key={index} aria-hidden={index > 0} className={classes.marquee__items}>
            {children}
          </section>
        ))}
      </div>
    </section>
  )
}

export default Marquee
