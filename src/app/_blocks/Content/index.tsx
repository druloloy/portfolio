'use client'
import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Gutter } from '../../_components/Gutter'
import { CMSLink } from '../../_components/Link'
import RichText from '../../_components/RichText'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'content' }>

export const ContentBlock: React.FC<
  Props & {
    id?: string
  }
> = props => {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { columns } = props
  const blockName = props.blockName

  React.useEffect(() => {
    if (blockName !== 'work_exp') {
      return
    }

    const twistObserver = (direction: 'left' | 'right') => {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add(
              classes[`twist${direction.charAt(0).toUpperCase()}${direction.slice(1)}`],
            )
          }
        })
      })

      return observer
    }

    const twistLeftObserver = twistObserver('left')
    const twistRightObserver = twistObserver('right')

    Array.from(contentRef.current.children).forEach((child: HTMLElement, index: number) => {
      if ((index + 1) % 2 !== 0) {
        twistLeftObserver.observe(child)
      } else {
        twistRightObserver.observe(child)
      }
    })

    return () => {
      twistLeftObserver.disconnect()
      twistRightObserver.disconnect()
    }
  }, [blockName])

  const Column = ({ size, enableLink, richText, link, index }) => (
    <div key={index} className={[classes.column, classes[`column--${size}`]].join(' ')}>
      <RichText content={richText} />
      {enableLink && <CMSLink className={classes.link} {...link} />}
    </div>
  )

  const DefaultBlock = ({ cols }: { cols: typeof columns | null }) => {
    if (!cols || cols.length <= 0) {
      return null
    }

    return (
      <>
        {cols.map((col, index) => {
          const { enableLink, richText, link, size } = col

          return (
            <Column
              key={index}
              size={size}
              enableLink={enableLink}
              richText={richText}
              link={link}
              index={index}
            />
          )
        })}
      </>
    )
  }

  const OneThird = ({ cols }: { cols: typeof columns | null }) => {
    if (!cols || cols.length <= 0) {
      return null
    }

    return (
      <>
        {cols.map((col, index) => {
          const { enableLink, richText, link, size } = col
          if (size !== 'oneThird') {
            return null
          }

          return (
            <Column
              key={index}
              size={size}
              enableLink={enableLink}
              richText={richText}
              link={link}
              index={index}
            />
          )
        })}
      </>
    )
  }

  const FullBlock = ({ cols }: { cols: typeof columns | null }) => {
    if (!cols || cols.length <= 0) {
      return null
    }

    return (
      <>
        {cols.map((col, index) => {
          const { enableLink, richText, link, size } = col
          if (size !== 'full') {
            return null
          }

          return (
            <Column
              key={index}
              size={size}
              enableLink={enableLink}
              richText={richText}
              link={link}
              index={index}
            />
          )
        })}
      </>
    )
  }

  const WorkExpBlock = () => {
    if (blockName !== 'work_exp') {
      return null
    }
    return (
      <>
        <FullBlock cols={columns} />

        <div ref={contentRef} className={[classes[blockName], classes.wrapper].join(' ')}>
          <OneThird cols={columns} />
        </div>
      </>
    )
  }

  return (
    <Gutter className={classes.content}>
      <div id={blockName} className={[classes.grid, classes[blockName]].join(' ')}>
        {blockName === 'work_exp' ? <WorkExpBlock /> : <DefaultBlock cols={columns} />}
      </div>
    </Gutter>
  )
}
