import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import type { Departement } from '@/types/api'
import GeocopiaHeader from '@/components/GeocopiaHeader'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/api/departements-index`, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const depts: { slug: string }[] = await res.json()
    return depts.filter(d => d.slug).map(d => ({ slug: d.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const res = await fetch(`${API_URL}/api/departements/${slug}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Département introuvable' }
  const d: Departement = await res.json()
  const nom = d.nom ?? slug
  const title = `${nom} — Communes et données immobilières`
  const description = `Explorez les communes du département ${nom} (${d.code}) et leurs données cadastrales.`
  return {
    title, description,
    alternates: { canonical: `/departement/${d.slug ?? slug}` },
    openGraph: { title, description, url: `/departement/${d.slug ?? slug}`, type: 'website' },
  }
}

export default async function DepartementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const res = await fetch(`${API_URL}/api/departements/${slug}`, {
    headers: { Accept: 'application/ld+json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) notFound()
  const dept: Departement = await res.json()

  if (dept.slug && dept.slug !== slug) {
    permanentRedirect(`/departement/${dept.slug}`)
  }

  const canonicalSlug = dept.slug ?? slug
  const nom = dept.nom ?? slug
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Carte', item: `${siteUrl}/carte` },
      ...(dept.slugRegion ? [{ '@type': 'ListItem', position: 2, name: dept.nomRegion ?? dept.codeRegion, item: `${siteUrl}/region/${dept.slugRegion}` }] : []),
      { '@type': 'ListItem', position: dept.slugRegion ? 3 : 2, name: nom, item: `${siteUrl}/departement/${canonicalSlug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GeocopiaHeader />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        <div className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
          <svg className="absolute right-0 top-0 pointer-events-none" style={{ opacity: 0.4 }}
            width="720" height="240" viewBox="0 0 720 240" aria-hidden="true">
            <defs>
              <pattern id="hero-cad" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0 H0 V80" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="720" height="240" fill="url(#hero-cad)" />
          </svg>

          <div className="parcelle-breadcrumb">
            <Link href="/carte" className="hover:text-white/80 transition-colors">Carte</Link>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            {dept.slugRegion && dept.nomRegion && (
              <>
                <Link href={`/region/${dept.slugRegion}`} className="hover:text-white/80 transition-colors">{dept.nomRegion}</Link>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
              </>
            )}
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>{nom}</span>
          </div>

          <div style={{ padding: '32px 40px 40px' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>Département</span>
              <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
              <span className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{dept.code}</span>
            </div>
            <h1 className="text-[38px] font-semibold leading-tight text-white"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
              {nom}
            </h1>
          </div>
        </div>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 0' }}>
          {dept.communes.length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <h2 className="text-xl font-semibold mb-5" style={{ color: 'var(--slate-900)', letterSpacing: '-0.005em' }}>
                Communes principales <span className="text-base font-normal" style={{ color: 'var(--slate-500)' }}>{dept.communes.length}</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {dept.communes.map(c => (
                  <Link key={c.codeInsee} href={`/commune/${c.slug}`}
                    className="block px-4 py-3 rounded-lg transition-colors hover:opacity-80"
                    style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', textDecoration: 'none' }}>
                    <div className="font-medium text-sm" style={{ color: 'var(--slate-900)' }}>{c.nom}</div>
                    {c.population && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--slate-500)' }}>{c.population.toLocaleString('fr-FR')} hab.</div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="parcelle-footer">
          <span>Geocopia — données cadastrales françaises</span>
          <span className="shrink-0 flex items-center gap-4 ml-4">
            <Link href="/mentions-legales" className="hover:text-slate-600 transition-colors">Mentions légales</Link>
            <span className="font-mono">Geocopia</span>
          </span>
        </div>

      </div>
    </>
  )
}
