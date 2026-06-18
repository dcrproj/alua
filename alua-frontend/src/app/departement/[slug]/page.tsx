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

function formatPrice(v: number) {
  return v.toLocaleString('fr-FR') + ' €/m²'
}

function buildDeptSummary(dept: Departement): string {
  const nom = dept.nom ?? ''
  const parts: string[] = []

  const communesTxt = dept.nbCommunesTotal > 0
    ? `${dept.nbCommunesTotal.toLocaleString('fr-FR')} commune${dept.nbCommunesTotal > 1 ? 's' : ''}`
    : null
  const popTxt = dept.populationTotale
    ? `${dept.populationTotale.toLocaleString('fr-FR')} habitants`
    : null
  if (communesTxt && popTxt) parts.push(`Le département ${nom} regroupe ${communesTxt} pour une population totale de ${popTxt}.`)
  else if (communesTxt) parts.push(`Le département ${nom} regroupe ${communesTxt}.`)

  if (dept.nbParcelles > 0 && dept.nbTransactions > 0) {
    parts.push(
      `Son territoire recense ${dept.nbParcelles.toLocaleString('fr-FR')} parcelles cadastrales et ${dept.nbTransactions.toLocaleString('fr-FR')} transactions immobilières enregistrées dans les données DVF depuis 2014.`
    )
  }

  if (dept.prixMedianM2) {
    const evol = dept.evolutionPrix.filter(e => e.prixMedianM2 !== null)
    if (evol.length >= 2) {
      const first = evol[0]
      const last = evol[evol.length - 1]
      const pct = first.prixMedianM2 ? Math.round(((last.prixMedianM2! - first.prixMedianM2) / first.prixMedianM2) * 100) : null
      const tendance = pct !== null
        ? (pct >= 0 ? `, en hausse de ${pct} % entre ${first.annee} et ${last.annee}` : `, en baisse de ${Math.abs(pct)} % entre ${first.annee} et ${last.annee}`)
        : ''
      parts.push(`Le prix médian au m² est de ${formatPrice(dept.prixMedianM2)}${tendance}.`)
    } else {
      parts.push(`Le prix médian au m² est de ${formatPrice(dept.prixMedianM2)}.`)
    }
  }

  if (dept.nbDpes > 0) {
    const dist = dept.distributionDpe
    const total = Object.values(dist).reduce((a, b) => a + b, 0)
    const bonnes = (dist['A'] ?? 0) + (dist['B'] ?? 0) + (dist['C'] ?? 0)
    const pctBon = total > 0 ? Math.round((bonnes / total) * 100) : null
    const dpeTxt = pctBon !== null
      ? `${dept.nbDpes.toLocaleString('fr-FR')} diagnostics de performance énergétique (DPE) ont été réalisés, dont ${pctBon} % classés C ou mieux.`
      : `${dept.nbDpes.toLocaleString('fr-FR')} diagnostics de performance énergétique (DPE) ont été réalisés.`
    parts.push(dpeTxt)
  }

  return parts.join(' ')
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const res = await fetch(`${API_URL}/api/departements/${slug}`, { headers: { Accept: 'application/ld+json' } })
  if (!res.ok) return { title: 'Département introuvable' }
  const d: Departement = await res.json()
  const nom = d.nom ?? slug
  const prixTxt = d.prixMedianM2 ? `, prix médian ${d.prixMedianM2.toLocaleString('fr-FR')} €/m²` : ''
  const title = `${nom} — Communes et données immobilières`
  const description = `Données immobilières du département ${nom} (${d.code}) : ${d.nbTransactions.toLocaleString('fr-FR')} transactions DVF${prixTxt}, ${d.nbCommunesTotal} communes, ${d.nbParcelles.toLocaleString('fr-FR')} parcelles cadastrales.`
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

  const summary = buildDeptSummary(dept)

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
            <Link href="/carte" prefetch={false} className="hover:text-white/80 transition-colors">Carte</Link>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            {dept.slugRegion && dept.nomRegion && (
              <>
                <Link href={`/region/${dept.slugRegion}`} prefetch={false} className="hover:text-white/80 transition-colors">{dept.nomRegion}</Link>
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
            <h1 className="text-[38px] font-semibold leading-tight text-white mb-4"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
              {nom}
            </h1>
            {summary && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 620 }}>
                {summary}
              </p>
            )}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {dept.prixMedianM2 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--amber-500)' }}>
                    {dept.prixMedianM2.toLocaleString('fr-FR')} €/m²
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Prix médian</div>
                </div>
              )}
              {dept.nbTransactions > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--amber-500)' }}>
                    {dept.nbTransactions.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Transactions DVF</div>
                </div>
              )}
              {dept.nbCommunesTotal > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--amber-500)' }}>
                    {dept.nbCommunesTotal.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Communes</div>
                </div>
              )}
              {dept.nbParcelles > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--amber-500)' }}>
                    {dept.nbParcelles.toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Parcelles cadastrales</div>
                </div>
              )}
            </div>
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
                  <Link key={c.codeInsee} href={`/commune/${c.slug}`} prefetch={false}
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
            <Link href="/mentions-legales" prefetch={false} className="hover:text-slate-600 transition-colors">Mentions légales</Link>
            <span className="font-mono">Geocopia</span>
          </span>
        </div>

      </div>
    </>
  )
}
