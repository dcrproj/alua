'use client'

import { useEffect } from 'react'

export default function CookieConsent() {
  useEffect(() => {
    if (document.getElementById('tarteaucitron-js')) return

    const script = document.createElement('script')
    script.id = 'tarteaucitron-js'
    script.src = 'https://cdn.jsdelivr.net/npm/tarteaucitronjs@1.17.0/tarteaucitron.min.js'
    script.async = true
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tac = (window as any).tarteaucitron
      if (!tac) return

      // user config et job AVANT init
      tac.user.adsenseId = 'ca-pub-4247463955296045'
      ;(tac.job = tac.job || []).push('adsense')

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
    }
    document.head.appendChild(script)
  }, [])

  return null
}
