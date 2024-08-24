'use client'
import React, { Fragment, useEffect, useRef, useState } from 'react'
import qs from 'qs'

import { Page, Post, Project, Stack } from '../../../payload/payload-types'
import { ArchiveBlockProps } from '../../_blocks/ArchiveBlock/types'
import { Gutter } from '../../_components/Gutter'
import { CMSLink } from '../../_components/Link'
import { Media } from '../../_components/Media'
import RichText from '../../_components/RichText'

import './override.scss'

import classes from './index.module.scss'

type Result = {
  docs: (Stack | string)[]
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number
  page: number
  prevPage: number
  totalPages: number
}

const TechnologyList = ({
  technologies,
  className,
  ariaHidden,
}: {
  technologies: string[]
  className?: string
  ariaHidden?: boolean
}) => {
  if (!technologies || technologies.length === 0) {
    return null // Handle empty list gracefully
  }

  return (
    <ul className={className} aria-hidden={ariaHidden}>
      {technologies.map((technology: string, i: number) => (
        <li key={i} className={classes.technology}>
          {technology}
        </li>
      ))}
    </ul>
  )
}

export default TechnologyList

const categories: ArchiveBlockProps['categories'] = [21, 20, 19]
const onResultChange: (result: Result) => void = () => null

export const RevampHero: React.FC<Page['hero']> = ({ richText, media, links, iconLinks }) => {
  const isRequesting = useRef(false)
  const hasHydrated = useRef(false)

  const [results, setResults] = useState<Result>({
    docs: [{ relationTo: 'stacks', value: '' }].map(doc => doc.value),
    hasNextPage: false,
    hasPrevPage: false,
    nextPage: 1,
    page: 1,
    prevPage: 1,
    totalPages: 1,
  })
  const [isLoading, setIsLoading] = React.useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout = null

    if (!isRequesting.current) {
      isRequesting.current = true

      // hydrate the block with fresh content after first render
      // don't show loader unless the request takes longer than x ms
      // and don't show it during initial hydration
      timer = setTimeout(() => {
        if (hasHydrated.current) {
          setIsLoading(true)
        }
      }, 500)

      const searchQuery = qs.stringify(
        {
          depth: 1,
          limit: 99,
          page: 1,
          sort: '-createdAt',
          where: {
            ...(categories
              ? {
                  categories: {
                    in: categories,
                  },
                }
              : {}),
          },
        },
        { encode: false },
      )

      const makeRequest = async () => {
        try {
          const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/stacks?${searchQuery}`)

          const json = await req.json()
          clearTimeout(timer)

          const { docs } = json as { docs: (Post | Project | Stack)[] }

          if (docs && Array.isArray(docs)) {
            setResults(json)
            setIsLoading(false)
            if (typeof onResultChange === 'function') {
              onResultChange(json)
            }
          }
        } catch (err) {
          console.warn(err) // eslint-disable-line no-console
          setIsLoading(false)
        }

        isRequesting.current = false
        hasHydrated.current = true
      }

      void makeRequest()
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [setResults, setIsLoading])

  const technologies = React.useMemo(() => {
    if (!results) return null
    return results.docs.map((doc: Stack) => doc.title)
  }, [results])

  return (
    <Gutter className={classes.hero}>
      <div className={classes.media}>
        {typeof media === 'object' && (
          <Fragment>
            <Media resource={media} imgClassName={classes.image} priority />
            {media?.caption && <RichText content={media.caption} className={classes.caption} />}
          </Fragment>
        )}
      </div>
      <div className={classes.content}>
        <div className={classes.techOverlay}>
          {Array.from({ length: 2 }).map((_, i) => (
            <TechnologyList
              technologies={technologies}
              className={classes.technologies}
              ariaHidden={i !== 0}
              key={i}
            />
          ))}
        </div>
        <RichText content={richText} />
        {Array.isArray(links) && links.length > 0 && (
          <ul className={classes.links}>
            {links.map(({ link }, i) => {
              return (
                <li
                  data-aos="fade-up"
                  data-aos-once="true"
                  data-aos-duration="1000"
                  data-aos-delay={500 * (i + 1)}
                  key={i}
                >
                  <CMSLink {...link} />
                </li>
              )
            })}
          </ul>
        )}
        {Array.isArray(iconLinks) && iconLinks.length > 0 && (
          <ul className={classes.blockLinks}>
            {iconLinks.map(({ iconLink }, i) => {
              return (
                <li
                  data-aos="fade-up"
                  data-aos-once="true"
                  data-aos-duration="1000"
                  data-aos-delay={500 * (i + 2)}
                  key={i}
                >
                  <CMSLink {...iconLink} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Gutter>
  )
}
