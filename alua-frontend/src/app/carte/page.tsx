import { Suspense } from 'react'
import type { Metadata } from 'next'
import MapWrapper from './MapWrapper'

export const metadata: Metadata = {
  title: 'Carte interactive — Parcelles, transactions DVF et DPE',
  description: 'Explorez la carte des parcelles cadastrales françaises. Visualisez les transactions immobilières DVF, les diagnostics DPE et les données de chaque parcelle.',
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'

const datasetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'Geocopia — Données immobilières françaises',
  description: 'Agrégation des données ouvertes immobilières françaises : 62 millions de parcelles cadastrales (PCI), transactions DVF depuis 2014, diagnostics DPE, 25 millions d\'adresses BAN.',
  url: siteUrl,
  creator: { '@type': 'Organization', name: 'Geocopia', url: siteUrl },
  license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence',
  temporalCoverage: '2014/..',
  spatialCoverage: { '@type': 'Place', name: 'France métropolitaine', containedInPlace: { '@type': 'Country', name: 'France' } },
  isBasedOn: [
    { '@type': 'Dataset', name: 'Base Adresse Nationale (BAN)', url: 'https://adresse.data.gouv.fr', creator: { '@type': 'Organization', name: 'IGN / ANCT / La Poste' } },
    { '@type': 'Dataset', name: 'Plan Cadastral Informatisé (PCI)', url: 'https://www.data.gouv.fr/fr/datasets/plan-cadastral-informatise/', creator: { '@type': 'Organization', name: 'DGFiP / IGN' } },
    { '@type': 'Dataset', name: 'Demandes de Valeurs Foncières (DVF)', url: 'https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/', creator: { '@type': 'Organization', name: 'DGFiP' } },
    { '@type': 'Dataset', name: 'Diagnostics de Performance Énergétique (DPE)', url: 'https://data.ademe.fr/datasets/dpe-v2-logements-existants', creator: { '@type': 'Organization', name: 'ADEME' } },
  ],
}

export default function CartePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Suspense>
          <MapWrapper />
        </Suspense>
      </div>
    </>
  )
}
