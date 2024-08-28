import React from 'react'
import { headers } from 'next/headers'
import Script from 'next/script'

export const GTMDataLayer: React.FC<{ gtmId: string }> = ({ gtmId }) => {
  const nonce = headers().get('x-nonce')
  return (
    <Script
      id="gtm"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer', '${gtmId}');
        `,
      }}
    />
  )
}

export const NoScript: React.FC<{ gtmId: string }> = ({ gtmId }) => {
  const nonce = headers().get('x-nonce')
  return (
    <noscript
      dangerouslySetInnerHTML={{
        __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
      }}
    />
  )
}
