import React from 'react'
import Link from 'next/link'

import { Page } from '@/payload-types'
import { Button, Props as ButtonProps } from '../Button'
import Icon, { IconTypes } from '../Icon'

// Editors paste links straight out of the address bar, so a link meant for this
// site arrives absolute — `https://example.com/#projects` rather than
// `/#projects`. Left alone that is a full page load out to the public domain and
// back, and it breaks outright in any environment not served from that host:
// locally it walks the visitor off the site entirely.
//
// Only URLs pointing at this site's own origin are rewritten. Genuine external
// links are left exactly as they are.
const toRelativeIfInternal = (href: string): string => {
  if (!href.startsWith('http')) return href

  const configured = process.env.NEXT_PUBLIC_SERVER_URL
  if (!configured) return href

  try {
    const target = new URL(href)
    if (target.host !== new URL(configured).host) return href
    return `${target.pathname}${target.search}${target.hash}` || '/'
  } catch {
    return href
  }
}

type CMSLinkType = {
  type?: 'custom' | 'reference' | 'iconUrl'
  url?: string
  newTab?: boolean
  reference?: {
    value: number | Page
    relationTo: 'pages'
  }
  label?: string
  appearance?: ButtonProps['appearance']
  children?: React.ReactNode
  className?: string
  invert?: ButtonProps['invert']
  icon?: string
  iconPicker?: string
}

export const CMSLink: React.FC<CMSLinkType> = ({
  type,
  icon,
  url,
  newTab,
  reference,
  label,
  appearance,
  children,
  className,
  invert,
}) => {
  const resolved =
    type === 'reference' && typeof reference?.value === 'object' && reference.value.slug
      ? `${reference?.relationTo !== 'pages' ? `/${reference?.relationTo}` : ''}/${
          reference.value.slug
        }`
      : url

  const href = resolved ? toRelativeIfInternal(resolved) : resolved

  if (!href) return null

  if (!appearance) {
    const newTabProps = newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}

    return (
      <Link {...newTabProps} href={href} className={className}>
        {icon && <Icon name={icon as IconTypes} />}
        {label && label}
        {children && children}
      </Link>
    )
  }

  return (
    <Button
      className={className}
      newTab={newTab}
      href={href}
      appearance={appearance}
      label={label}
      invert={invert}
      icon={icon}
    />
  )
}
