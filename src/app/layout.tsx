import React from 'react'
import { Metadata } from 'next'
import { Space_Grotesk, Work_Sans } from 'next/font/google'

import { AdminBar } from './_components/AdminBar'
import { Footer } from './_components/Footer'
import { GTMDataLayer } from './_components/GoogleAnalytics'
import { Header } from './_components/Header'
import { ScrollUp } from './_components/ScrollUp'
import { Providers } from './_providers'
import AOSWrapper from './_providers/AOS'
import { InitTheme } from './_providers/Theme/InitTheme'
import { mergeOpenGraph } from './_utilities/mergeOpenGraph'

import './_css/app.scss'

// add font
const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-work-sans',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-grotesk',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GTMDataLayer gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
        <InitTheme />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={[workSans.variable, spaceGrotesk.variable].join(' ')}>
        <Providers>
          <AdminBar />
          {/* @ts-expect-error */}
          <Header />
          <main className="main">
            <AOSWrapper>{children}</AOSWrapper>
          </main>
          {/* @ts-expect-error */}
          <Footer />
          <ScrollUp />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://payloadcms.com'),
  twitter: {
    card: 'summary_large_image',
    creator: '@druloloy',
  },
  openGraph: mergeOpenGraph(),
}
