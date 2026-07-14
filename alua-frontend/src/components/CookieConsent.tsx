'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CONSENT_KEY = 'geocopia_consent'
const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4247463955296045'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function loadAdsense() {
  if (document.getElementById('adsense-js')) return
  const script = document.createElement('script')
  script.id = 'adsense-js'
  script.src = ADSENSE_SRC
  script.async = true
  script.crossOrigin = 'anonymous'
  document.head.appendChild(script)
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = getCookie(CONSENT_KEY)
    if (consent === 'accepted') {
      loadAdsense()
    } else if (!consent) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const accept = () => {
    setCookie(CONSENT_KEY, 'accepted', 365)
    loadAdsense()
    setVisible(false)
  }

  const refuse = () => {
    setCookie(CONSENT_KEY, 'refused', 365)
    setVisible(false)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'var(--slate-900)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.5, flex: 1, margin: 0, minWidth: 260 }}>
        Geocopia utilise des cookies publicitaires (Google AdSense) pour financer le service.{' '}
        <Link href="/mentions-legales" style={{ color: 'var(--amber-400)', textDecoration: 'underline' }}>
          En savoir plus
        </Link>
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={refuse}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.55)',
            cursor: 'pointer',
          }}
        >
          Refuser
        </button>
        <button
          onClick={accept}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            borderRadius: 6,
            border: 'none',
            background: 'var(--amber-500)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Accepter
        </button>
      </div>
    </div>
  )
}
