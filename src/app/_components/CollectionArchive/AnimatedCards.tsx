import React, { useEffect, useImperativeHandle } from 'react'

import { Post, Project } from '../../../payload/payload-types'
import { Card } from '../Card'

import classes from './index.module.scss'

type Props = {
  cards: Array<string | Post | Project>
  relationTo: 'posts' | 'projects' | 'stacks'
} & React.HTMLProps<HTMLDivElement>

const AnimatedCards = React.forwardRef((props: Props, ref: React.ForwardedRef<unknown>) => {
  const { cards, relationTo } = props

  const trigger = React.useRef<HTMLDivElement>(null)
  const firstCardRef = React.useRef<HTMLDivElement>(null)
  const secondCardRef = React.useRef<HTMLDivElement>(null)
  const thirdCardRef = React.useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    trigger,
    firstCardRef,
    secondCardRef,
    thirdCardRef,
  }))

  return (
    <div ref={trigger} className={classes.grid}>
      {cards?.map((card, index) => {
        if (typeof card === 'object' && card !== null) {
          return (
            <div
              ref={index === 2 ? firstCardRef : index === 1 ? secondCardRef : thirdCardRef}
              className={[classes.column].join(' ')}
              key={index}
            >
              <Card doc={card} relationTo={relationTo} showCategories />
            </div>
          )
        }

        return null
      })}
    </div>
  )
})

export default AnimatedCards
