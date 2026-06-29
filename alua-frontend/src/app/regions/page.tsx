import type { Metadata } from 'next'
import Link from 'next/link'
import GeocopiaHeader from '@/components/GeocopiaHeader'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!

export const metadata: Metadata = {
  title: 'Données immobilières par région',
  description: 'Prix immobiliers, transactions DVF et diagnostics DPE par région et département en France métropolitaine.',
  alternates: { canonical: '/regions' },
}

interface RegionItem {
  code: string
  nom: string
  slug: string
}

export default async function RegionsPage() {
  let regions: RegionItem[] = []
  try {
    const res = await fetch(`${API_URL}/api/admin/regions`, { next: { revalidate: 86400 } })
    if (res.ok) regions = await res.json()
  } catch {}

  return (
    <>
      <GeocopiaHeader />
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 40px' }}>

          <div className="parcelle-breadcrumb" style={{ position: 'static', padding: '0 0 24px', background: 'transparent' }}>
            <Link href="/carte" style={{ color: 'var(--slate-500)', textDecoration: 'none' }}>Carte</Link>
            <span style={{ color: 'var(--slate-300)' }}>/</span>
            <span style={{ color: 'var(--slate-900)' }}>Régions</span>
          </div>

          <h1
            className="text-[32px] font-semibold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--slate-900)', letterSpacing: '-0.025em' }}
          >
            Données immobilières par région
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--slate-500)', lineHeight: 1.7, maxWidth: 680 }}>
            Prix médians DVF, diagnostics DPE et données cadastrales pour chaque région de France métropolitaine.
          </p>
          <p className="text-sm mb-10" style={{ color: 'var(--slate-500)', lineHeight: 1.7, maxWidth: 680 }}>
            Geocopia agrège les données officielles de la DGFiP (transactions DVF depuis 2014), de l&apos;ADEME
            (diagnostics de performance énergétique) et du Plan Cadastral Informatisé (IGN / DGFiP) pour
            produire des statistiques immobilières à l&apos;échelle de chaque région, département et commune.
            Sélectionnez une région ci-dessous pour accéder aux prix médians au m², à l&apos;évolution historique
            des prix et à la répartition des étiquettes énergétiques.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {regions.map(r => (
              <Link
                key={r.code}
                href={`/region/${r.slug}`}
                className="block rounded-xl transition-all hover:shadow-md hover:border-amber-300"
                style={{
                  padding: '20px 24px',
                  border: '1px solid var(--slate-200)',
                  background: 'white',
                  textDecoration: 'none',
                }}
              >
                <div
                  className="text-base font-semibold mb-1"
                  style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}
                >
                  {r.nom}
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--slate-400)' }}>
                  {r.code}
                </div>
              </Link>
            ))}
          </div>

        </div>

        <div className="parcelle-footer">
          <span>Sources : Cadastre IGN · DVF DGFiP · DPE ADEME</span>
          <span className="shrink-0 flex items-center gap-4 ml-4">
            <Link href="/mentions-legales" className="hover:text-slate-600 transition-colors">Mentions légales</Link>
            <span className="font-mono">Geocopia</span>
          </span>
        </div>

      </div>
    </>
  )
}
