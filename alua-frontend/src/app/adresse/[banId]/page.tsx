import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Euro, Flame } from 'lucide-react'
import type { Address } from '@/types/api'
import { formatPrice, formatDate, DpeBadge } from '@/components/fiche'
import GeocopiaHeader from '@/components/GeocopiaHeader'
import AddressMapWrapper from './AddressMapWrapper'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!

export async function generateMetadata({ params }: { params: Promise<{ banId: string }> }) {
  const { banId } = await params
  const res = await fetch(`${API_URL}/api/addresses/${banId}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Adresse introuvable' }
  const a: Address = await res.json()
  const label = [a.numero, a.voie, a.commune].filter(Boolean).join(' ')
  const title = `${label} — Transactions et DPE`
  const description = `Transactions DVF et diagnostics DPE pour l'adresse ${label}${a.codePostal ? ` (${a.codePostal})` : ''}.`
  return {
    title, description,
    alternates: { canonical: `/adresse/${banId}` },
    openGraph: { title, description, url: `/adresse/${banId}`, type: 'website' },
  }
}

export default async function AdressePage({ params }: { params: Promise<{ banId: string }> }) {
  const { banId } = await params

  const res = await fetch(`${API_URL}/api/addresses/${banId}`, {
    headers: { Accept: 'application/ld+json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) notFound()
  const address: Address = await res.json()

  const adresseLabel = [address.numero, address.voie].filter(Boolean).join(' ')
  const postalLabel = [address.codePostal, address.commune].filter(Boolean).join(' ')
  const fullLabel = [adresseLabel, address.codePostal, address.commune].filter(Boolean).join(', ')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Carte', item: `${siteUrl}/carte` },
        ...(address.communeCode && address.communeSlug ? [{ '@type': 'ListItem', position: 2, name: address.commune ?? address.communeCode, item: `${siteUrl}/commune/${address.communeSlug}` }] : []),
        { '@type': 'ListItem', position: address.communeCode ? 3 : 2, name: fullLabel, item: `${siteUrl}/adresse/${banId}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: fullLabel,
      address: {
        '@type': 'PostalAddress',
        streetAddress: adresseLabel || undefined,
        postalCode: address.codePostal ?? undefined,
        addressLocality: address.commune ?? undefined,
        addressCountry: 'FR',
      },
      ...(address.lat && address.lon ? { geo: { '@type': 'GeoCoordinates', latitude: address.lat, longitude: address.lon } } : {}),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <GeocopiaHeader />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* ── Dark hero ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
          <svg className="absolute right-0 top-0 pointer-events-none" style={{ opacity: 0.4 }}
            width="720" height="300" viewBox="0 0 720 300" aria-hidden="true">
            <defs>
              <pattern id="hero-cad" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0 H0 V80" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="720" height="300" fill="url(#hero-cad)" />
            <g fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1">
              <path d="M0 80 Q200 70, 360 90 T720 100" />
              <path d="M0 190 Q180 180, 360 200 T720 210" />
              <path d="M160 0 Q180 80, 150 190 T180 300" />
            </g>
            <g fill="none" stroke="rgba(217,119,6,0.25)" strokeWidth="1.2">
              <path d="M560 70 L650 60 L665 140 L570 148 Z" />
            </g>
          </svg>

          <div className="parcelle-breadcrumb">
            <Link href="/carte" className="hover:text-white/80 transition-colors">Carte</Link>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            {address.communeCode && address.commune && address.communeSlug ? (
              <Link href={`/commune/${address.communeSlug}`} className="hover:text-white/80 transition-colors">
                {address.commune}
              </Link>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>{address.commune}</span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <span className="font-mono" style={{ color: 'rgba(255,255,255,0.9)' }}>{adresseLabel || banId}</span>
          </div>

          <div className="parcelle-hero-grid">
            {/* Identity */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>
                  Adresse
                </span>
                <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
              </div>
              <h1
                className="text-[36px] font-semibold leading-tight text-white mb-3"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
              >
                {adresseLabel || 'Adresse'}
              </h1>
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {postalLabel}
                {address.parcelles.length > 0 && (
                  <>
                    <span className="mx-2" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                    {address.parcelles.length} parcelle{address.parcelles.length > 1 ? 's' : ''}
                  </>
                )}
              </div>
            </div>

            {/* Mini-map */}
            {address.lat !== null && address.lon !== null && (
              <div
                className="parcelle-hero-map rounded overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
              >
                <div style={{ height: 138, position: 'relative', background: 'rgba(255,255,255,0.04)' }}>
                  <AddressMapWrapper lon={address.lon} lat={address.lat} />
                </div>
                <div
                  className="px-2.5 py-1.5 text-[11px] font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                >
                  {address.lat.toFixed(4)}°N {address.lon.toFixed(4)}°E
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        <div className="parcelle-content-grid">
          <main>

            {/* Transactions DVF */}
            <section id="section-dvf" style={{ marginBottom: 56 }}>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="gc-icon-dvf w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                  <Euro size={18} />
                </div>
                <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
                  Transactions DVF
                </h2>
              </div>

              {address.transactions.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--slate-500)' }}>Aucune transaction enregistrée.</p>
              ) : (
                <div>
                  {address.transactions.map((t, i) => {
                    const surf = t.surfaceBati ?? t.surfaceCarrez
                    const pm2 = surf && surf > 0 && t.valeurFonciere ? Math.round(t.valeurFonciere / surf) : null
                    return (
                      <div
                        key={`${t.idMutation}-${i}`}
                        className="py-4 border-t"
                        style={{ borderColor: 'var(--slate-200)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'baseline' }}
                      >
                        <div>
                          <div className="text-[22px] font-semibold tabular-nums mb-1" style={{ color: 'var(--slate-900)', letterSpacing: '-0.01em' }}>
                            {t.valeurFonciere ? formatPrice(t.valeurFonciere) : '—'}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--slate-600)' }}>
                            {[t.typeLocal, surf ? `${surf} m²` : null, pm2 ? `${formatPrice(pm2)}/m²` : null]
                              .filter(Boolean)
                              .map((s, i, arr) => (
                                <span key={i}>{s}{i < arr.length - 1 && <span style={{ color: 'var(--slate-400)', margin: '0 5px' }}>·</span>}</span>
                              ))}
                          </div>
                          {t.idParcelle && (
                            <Link
                              href={`/parcelle/${t.idParcelle}`}
                              className="font-mono text-[11px] hover:underline mt-1 inline-block transition-opacity hover:opacity-70"
                              style={{ color: 'var(--slate-400)', textDecorationColor: 'var(--slate-300)' }}
                            >
                              {t.idParcelle}
                            </Link>
                          )}
                        </div>
                        <div className="text-sm whitespace-nowrap" style={{ color: 'var(--slate-600)' }}>
                          {formatDate(t.date)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Diagnostics DPE */}
            <section id="section-dpe" style={{ marginBottom: 56 }}>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="gc-icon-dpe w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                  <Flame size={18} />
                </div>
                <h2 className="flex-1 text-xl font-semibold tracking-tight" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
                  Diagnostics DPE
                </h2>
                <span className="text-sm" style={{ color: 'var(--slate-500)' }}>ADEME</span>
              </div>

              {address.dpes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--slate-500)' }}>Aucun DPE enregistré.</p>
              ) : (
                <div>
                  {address.dpes.map(d => (
                    <div
                      key={d.numeroDpe}
                      className="py-4 border-t"
                      style={{ borderColor: 'var(--slate-200)', display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: '0 18px', alignItems: 'center' }}
                    >
                      {d.etiquetteDpe && <DpeBadge label={d.etiquetteDpe} size="lg" />}
                      {d.etiquetteGes && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--slate-600)' }}>
                          <span>GES</span><DpeBadge label={d.etiquetteGes} />
                        </div>
                      )}
                      {!d.etiquetteDpe && <div />}
                      {!d.etiquetteGes && <div />}
                      <div>
                        <div className="text-sm">
                          <span className="font-medium" style={{ color: 'var(--slate-800)' }}>{d.typeBatiment ?? 'bâtiment'}</span>
                          {d.surface && <span className="ml-2" style={{ color: 'var(--slate-500)' }}>{d.surface} m²</span>}
                        </div>
                        {d.consoPrimaire !== null && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--slate-600)' }}>
                            {Math.round(d.consoPrimaire)} kWhEP/m²·an
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-right" style={{ color: 'var(--slate-600)' }}>
                        <div>{formatDate(d.date)}</div>
                        {d.dateFinValidite && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--slate-400)' }}>
                            valide jusqu&apos;au {formatDate(d.dateFinValidite)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </main>

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside>
            {address.parcelles.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
                  Parcelle{address.parcelles.length > 1 ? 's' : ''} cadastrale{address.parcelles.length > 1 ? 's' : ''}
                </h4>
                <div className="space-y-2">
                  {address.parcelles.map(p => (
                    <Link
                      key={p.idParcelle}
                      href={`/parcelle/${p.idParcelle}`}
                      prefetch={false}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:opacity-80"
                      style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', textDecoration: 'none' }}
                    >
                      <span className="font-mono text-xs" style={{ color: 'var(--slate-700)' }}>{p.idParcelle}</span>
                      <span className="text-xs" style={{ color: 'var(--slate-500)' }}>
                        {[p.section && `Sect. ${p.section}`, p.contenance ? `${p.contenance.toLocaleString('fr-FR')} m²` : null]
                          .filter(Boolean).join(' · ')}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {address.communeCode && address.commune && address.communeSlug && (
              <div className={address.parcelles.length > 0 ? 'mt-5 pt-5' : ''} style={address.parcelles.length > 0 ? { borderTop: '1px solid var(--slate-200)' } : {}}>
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-body)' }}>
                  Commune
                </h4>
                <Link
                  href={`/commune/${address.communeSlug}`}
                  prefetch={false}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:opacity-80"
                  style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', textDecoration: 'none' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--slate-700)' }}>{address.commune}</span>
                  <span className="text-xs" style={{ color: 'var(--slate-400)' }}>Fiche commune →</span>
                </Link>
              </div>
            )}
          </aside>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="parcelle-footer">
          <span>Sources : BAN IGN · DVF DGFiP · DPE ADEME · Cadastre IGN</span>
          <span className="shrink-0 flex items-center gap-4 ml-4">
            <Link href="/mentions-legales" className="hover:text-slate-600 transition-colors">Mentions légales</Link>
            <span className="font-mono">Geocopia</span>
          </span>
        </div>

      </div>
    </>
  )
}
