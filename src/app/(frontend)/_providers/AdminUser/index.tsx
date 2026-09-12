'use client'

import { useEffect, useState } from 'react'

import type { User } from '@/payload-types'

/**
 * Read-only view of the currently authenticated Payload user.
 *
 * This exists solely so the front-end AdminBar can decide whether to render.
 * It deliberately offers no login, logout, or account mutation: the site has
 * no public account system, and the admin panel at /admin owns authentication.
 */
export const useAdminUser = (): { user: User | null; isLoading: boolean } => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const load = async (): Promise<void> => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/me`, {
          credentials: 'include',
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error('Not authenticated')
        }

        const { user: me } = await res.json()

        if (!cancelled) {
          setUser(me ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return { user, isLoading }
}
