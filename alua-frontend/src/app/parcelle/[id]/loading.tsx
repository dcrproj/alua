import ParcelleFicheHeader from './ParcelleFicheHeader'
import ParcelleTocNav from './ParcelleTocNav'

function SkDark({ w, h }: { w: string; h: string }) {
  return (
    <div
      className="animate-pulse rounded"
      style={{ width: w, height: h, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
    />
  )
}

function Sk({ w, h, radius }: { w: string; h: string; radius?: string }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, background: '#e2e8f0', borderRadius: radius ?? '4px', flexShrink: 0 }}
    />
  )
}

export default function Loading() {
  return (
    <>
      <ParcelleFicheHeader />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Dark hero skeleton */}
        <div className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>

          {/* Breadcrumb row */}
          <div className="parcelle-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SkDark w="32px" h="12px" />
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <SkDark w="72px" h="12px" />
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <SkDark w="120px" h="12px" />
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <SkDark w="160px" h="12px" />
          </div>

          {/* Hero grid */}
          <div className="parcelle-hero-grid">
            {/* Left — identity */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <SkDark w="60px" h="11px" />
                <SkDark w="24px" h="1px" />
                <SkDark w="120px" h="11px" />
              </div>
              <SkDark w="320px" h="40px" />
              <div style={{ marginTop: 12 }}>
                <SkDark w="220px" h="14px" />
              </div>
            </div>

            {/* Middle — map placeholder */}
            <div
              className="parcelle-hero-map rounded overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
            >
              <div style={{ height: 138, background: 'rgba(255,255,255,0.04)' }} />
              <div
                style={{
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.06)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <SkDark w="120px" h="11px" />
                <SkDark w="48px" h="11px" />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky TOC nav — rendu immédiatement, aucune donnée requise */}
        <div style={{ background: 'white', borderBottom: '1px solid var(--slate-200)', position: 'sticky', top: 0, zIndex: 10, overflowX: 'auto' }}>
          <ParcelleTocNav />
        </div>

        {/* Content skeleton */}
        <div className="parcelle-content-grid">
          <main>
            {/* Summary text */}
            <div style={{ marginBottom: 56, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Sk w="100%" h="16px" />
              <Sk w="75%" h="16px" />
            </div>

            {/* 3 section cards */}
            {[0, 1, 2].map(i => (
              <div key={i} style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <Sk w="36px" h="36px" radius="8px" />
                  <Sk w="160px" h="20px" />
                </div>
                <Sk w="100%" h="120px" radius="12px" />
                <div style={{ marginTop: 12 }}>
                  <Sk w="50%" h="14px" />
                </div>
              </div>
            ))}
          </main>

          <aside>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Sk w="100%" h="180px" radius="12px" />
              <Sk w="100%" h="100px" radius="12px" />
              <Sk w="100%" h="80px" radius="12px" />
            </div>
          </aside>
        </div>

      </div>
    </>
  )
}
