import type { Metadata } from 'next'
import Link from 'next/link'
import GeocopiaHeader from '@/components/GeocopiaHeader'

export const metadata: Metadata = {
  title: 'Open Data — Sources et réutilisation',
  description: 'Geocopia agrège 8 bases de données publiques françaises : BAN, PCI, DVF, DPE, Géorisques, BDNB, SIRENE, Sitadel. Accédez directement aux sources ouvertes.',
  alternates: { canonical: '/open-data' },
  robots: { index: true, follow: true },
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'

const datasetsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'DataCatalog',
  name: 'Geocopia — Open Data immobilier français',
  description: 'Catalogue des sources de données ouvertes agrégées par Geocopia pour l\'analyse immobilière en France.',
  url: `${siteUrl}/open-data`,
  license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence',
  creator: { '@type': 'Organization', name: 'Geocopia', url: siteUrl },
  dataset: [
    { '@type': 'Dataset', name: 'Base Adresse Nationale (BAN)', url: 'https://adresse.data.gouv.fr', creator: { '@type': 'Organization', name: 'IGN / ANCT / La Poste' } },
    { '@type': 'Dataset', name: 'Plan Cadastral Informatisé (PCI)', url: 'https://www.data.gouv.fr/fr/datasets/plan-cadastral-informatise/', creator: { '@type': 'Organization', name: 'DGFiP / IGN' } },
    { '@type': 'Dataset', name: 'Demandes de Valeurs Foncières (DVF)', url: 'https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/', creator: { '@type': 'Organization', name: 'DGFiP' } },
    { '@type': 'Dataset', name: 'Diagnostics de Performance Énergétique (DPE)', url: 'https://data.ademe.fr/datasets/dpe-v2-logements-existants', creator: { '@type': 'Organization', name: 'ADEME' } },
    { '@type': 'Dataset', name: 'Géorisques', url: 'https://www.georisques.gouv.fr/api-georisques', creator: { '@type': 'Organization', name: 'BRGM / MTES' } },
    { '@type': 'Dataset', name: 'Base Nationale des Bâtiments (BDNB)', url: 'https://bdnb.io', creator: { '@type': 'Organization', name: 'CSTB / ADEME' } },
    { '@type': 'Dataset', name: 'SIRENE', url: 'https://www.sirene.fr', creator: { '@type': 'Organization', name: 'INSEE' } },
    { '@type': 'Dataset', name: 'Sitadel', url: 'https://www.statistiques.developpement-durable.gouv.fr', creator: { '@type': 'Organization', name: 'SDES' } },
  ],
}

const sources = [
  {
    id: 'ban',
    label: 'BAN',
    name: 'Base Adresse Nationale',
    publisher: 'IGN / ANCT / La Poste',
    volume: '25 millions d\'adresses',
    usage: 'Géocodage, fiches adresse, autocomplétion de la barre de recherche.',
    refresh: 'Tous les 75 jours environ',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://www.data.gouv.fr/fr/datasets/base-adresse-nationale/',
    api: 'https://adresse.data.gouv.fr/api-doc/adresse',
  },
  {
    id: 'pci',
    label: 'PCI',
    name: 'Plan Cadastral Informatisé',
    publisher: 'DGFiP / IGN',
    volume: '62 millions de parcelles',
    usage: 'Fiches parcelle, tuiles vectorielles cadastrales sur la carte, contenance et identifiants.',
    refresh: 'Tous les 180 jours environ',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://www.data.gouv.fr/fr/datasets/plan-cadastral-informatise/',
    api: null,
  },
  {
    id: 'dvf',
    label: 'DVF',
    name: 'Demandes de Valeurs Foncières',
    publisher: 'DGFiP',
    volume: 'Toutes les ventes depuis 2014',
    usage: 'Transactions sur les fiches parcelle et commune, prix médians, évolution historique des prix.',
    refresh: 'Annuel (publication DGFiP)',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/',
    api: 'https://api.gouv.fr/les-api/api_dvf',
  },
  {
    id: 'dpe',
    label: 'DPE',
    name: 'Diagnostics de Performance Énergétique',
    publisher: 'ADEME',
    volume: 'Plusieurs millions de diagnostics',
    usage: 'Étiquettes énergétiques sur les fiches parcelle et adresse, distribution DPE par commune.',
    refresh: 'Continu (API ADEME)',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://data.ademe.fr/datasets/dpe-v2-logements-existants',
    api: 'https://data.ademe.fr/datasets/dpe-v2-logements-existants',
  },
  {
    id: 'georisques',
    label: 'Géorisques',
    name: 'Risques naturels et technologiques',
    publisher: 'BRGM / Ministère de la Transition Écologique',
    volume: 'Couverture France entière',
    usage: 'Section "Risques" sur les fiches parcelle : PPRI, PPRN, PPRT, cavités, radon, séisme…',
    refresh: 'À la demande (API Géorisques), mise en cache 30 jours',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://www.georisques.gouv.fr/api-georisques',
    api: 'https://georisques.gouv.fr/api-georisques',
  },
  {
    id: 'bdnb',
    label: 'BDNB',
    name: 'Base Nationale des Bâtiments',
    publisher: 'CSTB / ADEME',
    volume: 'Tous les bâtiments de France',
    usage: 'Caractéristiques du bâti sur la fiche parcelle : usage, année de construction, nombre de logements.',
    refresh: 'Annuel',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://bdnb.io',
    api: null,
  },
  {
    id: 'rnic',
    label: 'RNIC',
    name: 'Registre National des Copropriétés',
    publisher: 'ANAH',
    volume: 'Toutes les copropriétés immatriculées',
    usage: 'Section "Copropriété" sur les fiches parcelle : lots, syndic, date de règlement.',
    refresh: 'Annuel',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://www.registre-coproprietes.gouv.fr',
    api: null,
  },
  {
    id: 'sirene',
    label: 'SIRENE',
    name: 'Répertoire des entreprises et établissements',
    publisher: 'INSEE',
    volume: 'Tous les établissements actifs',
    usage: 'Section "Entreprises" sur les fiches parcelle : SIRET, raison sociale, code NAF.',
    refresh: 'Mensuel',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://www.sirene.fr',
    api: 'https://api.gouv.fr/les-api/api-sirene-entreprises',
  },
  {
    id: 'sitadel',
    label: 'Sitadel',
    name: 'Système d\'information et de traitement automatisé des données élémentaires sur les logements',
    publisher: 'SDES / Ministère de la Transition Écologique',
    volume: 'Permis de construire depuis 2000',
    usage: 'Section "Permis de construire" sur les fiches parcelle : type, date, surfaces créées.',
    refresh: 'Mensuel',
    license: 'Licence Ouverte 2.0',
    datagouv: 'https://www.statistiques.developpement-durable.gouv.fr/catalogue?tag=Sitadel',
    api: null,
  },
]

export default function OpenDataPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetsJsonLd) }} />

      <GeocopiaHeader />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {/* Hero */}
        <div className="relative overflow-hidden" style={{ background: 'var(--slate-900)' }}>
          <svg className="absolute right-0 top-0 pointer-events-none" style={{ opacity: 0.4 }}
            width="720" height="220" viewBox="0 0 720 220" aria-hidden="true">
            <defs>
              <pattern id="hero-cad" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M80 0 H0 V80" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="720" height="220" fill="url(#hero-cad)" />
            <g fill="none" stroke="rgba(217,119,6,0.25)" strokeWidth="1.2">
              <path d="M540 60 L640 50 L658 130 L555 138 Z" />
            </g>
          </svg>

          <div className="parcelle-breadcrumb">
            <Link href="/carte" prefetch={false} className="hover:text-white/80 transition-colors">Carte</Link>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>Open Data</span>
          </div>

          <div style={{ padding: '28px 40px 36px', maxWidth: 860, margin: '0 auto' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--amber-500)' }}>
                Sources
              </span>
              <span className="w-6 h-px" style={{ background: 'var(--amber-500)' }} />
            </div>
            <h1
              className="text-[34px] font-semibold leading-tight text-white mb-3"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
            >
              Open Data
            </h1>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 560, lineHeight: 1.65 }}>
              Geocopia est construit exclusivement sur des données publiques françaises redistribuées sous Licence Ouverte. Voici les 9 sources que nous agrégeons, avec leurs liens directs.
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 40px 0' }}>

          {/* Intro */}
          <p className="mb-10 leading-relaxed" style={{ fontSize: 15, color: 'var(--slate-600)', lineHeight: 1.75, maxWidth: 680 }}>
            Toutes les données présentées sur Geocopia sont issues de bases publiques officielles, accessibles librement sur{' '}
            <a href="https://www.data.gouv.fr" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--amber-600)' }}>
              data.gouv.fr
            </a>{' '}
            ou via des API gouvernementales. Elles sont redistribuées conformément à la{' '}
            <a href="https://www.etalab.gouv.fr/licence-ouverte-open-licence" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--amber-600)' }}>
              Licence Ouverte / Open Licence Etalab 2.0
            </a>.
          </p>

          {/* Sources list */}
          <div className="space-y-0">
            {sources.map((s, i) => (
              <div
                key={s.id}
                className="py-8"
                style={{ borderTop: i === 0 ? '2px solid var(--slate-900)' : '1px solid var(--slate-200)' }}
              >
                <div className="flex items-start gap-5">
                  {/* Badge */}
                  <div
                    className="shrink-0 font-mono text-[11px] font-bold px-2 py-1 rounded"
                    style={{ background: 'var(--slate-900)', color: 'var(--amber-500)', letterSpacing: '0.08em', marginTop: 2 }}
                  >
                    {s.label}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                      <h2 className="text-base font-semibold" style={{ color: 'var(--slate-900)', fontFamily: 'var(--font-display)' }}>
                        {s.name}
                      </h2>
                      <span className="text-sm" style={{ color: 'var(--slate-500)' }}>{s.publisher}</span>
                    </div>

                    <p className="text-sm mb-3" style={{ color: 'var(--slate-600)', lineHeight: 1.65 }}>
                      <strong style={{ color: 'var(--slate-700)' }}>Utilisation : </strong>{s.usage}
                    </p>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs mb-4" style={{ color: 'var(--slate-500)' }}>
                      <span><strong style={{ color: 'var(--slate-700)' }}>Volume :</strong> {s.volume}</span>
                      <span><strong style={{ color: 'var(--slate-700)' }}>Refresh :</strong> {s.refresh}</span>
                      <span><strong style={{ color: 'var(--slate-700)' }}>Licence :</strong> {s.license}</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <a
                        href={s.datagouv}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-opacity hover:opacity-75"
                        style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', border: '1px solid var(--slate-200)' }}
                      >
                        Accéder à la source ↗
                      </a>
                      {s.api && (
                        <a
                          href={s.api}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-opacity hover:opacity-75"
                          style={{ background: 'var(--amber-50)', color: 'var(--amber-700)', border: '1px solid var(--amber-100)' }}
                        >
                          Documentation API ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="parcelle-footer" style={{ marginTop: 56 }}>
          <span>Geocopia — données immobilières France</span>
          <span className="font-mono shrink-0 ml-4">geocopia.fr</span>
        </div>

      </div>
    </>
  )
}
