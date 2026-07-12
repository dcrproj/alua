'use client'

import Script from 'next/script'

export default function CookieConsent() {
  return (
    <Script
      id="tarteaucitron"
      src="https://cdn.jsdelivr.net/npm/tarteaucitronjs@1.17.0/tarteaucitron.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tac = (window as any).tarteaucitron
        tac.init({
          privacyUrl: '/mentions-legales',
          orientation: 'bottom',
          groupServices: false,
          showDetailsOnClick: true,
          serviceDefaultState: 'wait',
          showAlertSmall: false,
          cookieslist: false,
          acceptAllCta: true,
          highPrivacy: false,
          handleBrowserDNTRequest: false,
          removeCredit: false,
          moreInfoLink: true,
          useExternalCss: false,
          googleConsentMode: 'enable',
        })
        tac.user.adsenseId = 'ca-pub-4247463955296045'
        ;(tac.job = tac.job || []).push('adsense')
      }}
    />
  )
}
