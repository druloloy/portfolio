'use client'

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import qs from 'qs'

import type { Category, Post, Project, Stack } from '../../../payload/payload-types'
import { StacksParadeProps } from '../../_blocks/StacksParade/types'
import { Gutter } from '../Gutter'
import Marquee from '../Marquee'
import { StackCard } from '../StackCard'

import classes from './index.module.scss'

type Result = {
  docs: (Stack | string)[]
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number
  page: number
  prevPage: number
  totalDocs: number
  totalPages: number
}

export type Props = {
  categories?: StacksParadeProps['categories']
  className?: string
  limit?: number
  onResultChange?: (result: Result) => void // eslint-disable-line no-unused-vars
  populateBy?: 'collection'
  populatedDoc?: StacksParadeProps['populatedDoc']
  populatedDocsTotal?: StacksParadeProps['populatedDocsTotal']
  relationTo?: 'posts' | 'projects' | 'stacks'
  showPageRange?: boolean
  sort?: string
}

export const CollectionStacksParade: React.FC<Props> = props => {
  const {
    categories: catsFromProps,
    className,
    limit = 10,
    onResultChange,
    populateBy,
    populatedDoc,
    populatedDocsTotal,
    relationTo,
    sort = '-createdAt',
  } = props

  const [results, setResults] = useState<Result>({
    docs: (populatedDoc || [])?.map(doc => doc.value),
    hasNextPage: false,
    hasPrevPage: false,
    nextPage: 1,
    page: 1,
    prevPage: 1,
    totalDocs: typeof populatedDocsTotal === 'number' ? populatedDocsTotal : 0,
    totalPages: 1,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasHydrated = useRef(false)
  const isRequesting = useRef(false)
  const [page, setPage] = useState(1)

  const categories = (catsFromProps || [])
    .map(cat => (typeof cat === 'object' ? cat.id : cat))
    .join(',')

  const scrollToRef = useCallback(() => {
    const { current } = scrollRef
    if (current) {
      // current.scrollIntoView({
      //   behavior: 'smooth',
      // })
    }
  }, [])

  const sortResults = useCallback((results: Result) => {
    // sort according to categories
    let categories = {}

    results.docs.forEach((doc: Stack) => {
      const cat = (doc.categories?.[0] as Category)?.title

      if (cat) {
        categories[cat] = [...(categories[cat] || []), doc]
      }
    })

    return categories
  }, [])

  useEffect(() => {
    if (!isLoading && typeof results.page !== 'undefined') {
      // scrollToRef()
    }
  }, [isLoading, scrollToRef, results])

  useEffect(() => {
    let timer: NodeJS.Timeout = null

    if (populateBy === 'collection' && !isRequesting.current) {
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
          limit,
          page,
          sort,
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
          const req = await fetch(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/${relationTo}?${searchQuery}`,
          )

          const json = await req.json()
          clearTimeout(timer)

          const { docs } = json as { docs: (Post | Project | Stack | string)[] }

          if (docs && Array.isArray(docs)) {
            setResults(json)
            setIsLoading(false)
            if (typeof onResultChange === 'function') {
              onResultChange(json)
            }
          }
        } catch (err) {
          console.warn(err)
          setIsLoading(false)
          setError(`Unable to load "${relationTo} archive" data at this time.`)
        }

        isRequesting.current = false
        hasHydrated.current = true
      }

      void makeRequest()
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [page, categories, relationTo, onResultChange, sort, limit, populateBy])

  const sortedResults = sortResults(results)

  return (
    <Gutter>
      <div className={[classes.stacks, className].filter(Boolean).join(' ')}>
        {error && <div className={classes.error}>{error}</div>}
        {isLoading && <div className={classes.loader}>Loading...</div>}

        <section className={classes.stacks__container}>
          {Object.keys(sortedResults).map((cat, index) => (
            <div
              data-aos="fade-up"
              data-aos-once="true"
              data-aos-duration="1000"
              key={cat}
              className={classes.category}
            >
              <h3>{cat}</h3>
              <Marquee reverse={index % 2 !== 0}>
                {sortedResults[cat].map((doc: Stack) => (
                  <div className={classes.stacks__items} key={doc.id}>
                    <StackCard doc={doc} relationTo="stacks" />
                  </div>
                ))}
              </Marquee>
            </div>
          ))}
        </section>
      </div>
    </Gutter>
  )
}
