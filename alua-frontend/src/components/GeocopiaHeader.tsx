'use client'

import Link from 'next/link'
import SearchBar, { type BanFeature } from '@/components/SearchBar'

interface Props {
  onSearchSelect?: (feature: BanFeature) => void
  activeRoute?: string
}

export default function GeocopiaHeader({ onSearchSelect, activeRoute }: Props) {
  return (
    <header
      style={{
        height: 56,
        background: 'white',
        borderBottom: '1px solid var(--slate-200)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo — left */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
        <div
          style={{
            width: 28, height: 28, borderRadius: 4,
            background: 'var(--slate-900)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            color: 'var(--amber-500)', fontSize: 17, letterSpacing: '-0.02em',
          }}
        >
          g
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 17, letterSpacing: '-0.02em', color: 'var(--slate-900)',
          }}
        >
          geocopia
        </span>
      </Link>

      {/* Search — absolutely centered */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 480,
        maxWidth: 'calc(100% - 320px)',
      }}>
        <SearchBar onSelect={onSearchSelect} />
      </div>

      {/* Nav — right */}
      <nav style={{ display: 'flex', gap: 2, marginLeft: 'auto', flexShrink: 0 }}>
        {activeRoute === 'carte' ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            height: 30, padding: '0 12px',
            borderRadius: 6, fontSize: 15, fontWeight: 500,
            background: 'var(--slate-100)', color: 'var(--slate-900)',
          }}>
            Carte
          </span>
        ) : (
          <Link
            href="/carte"
            style={{
              display: 'inline-flex', alignItems: 'center',
              height: 30, padding: '0 12px',
              borderRadius: 6, fontSize: 15, fontWeight: 500,
              color: 'var(--slate-600)',
              textDecoration: 'none',
              transition: 'background .15s, color .15s',
            }}
            className="hover:bg-[#f1f5f9] hover:text-[#1e293b]"
          >
            Carte
          </Link>
        )}
      </nav>
    </header>
  )
}
