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
    { '@type': 'Dataset', name: 'Base Adresse Nationale (BAN)', description: 'Référentiel national de 25 millions d\'adresses géolocalisées en France métropolitaine.', url: 'https://adresse.data.gouv.fr', creator: { '@type': 'Organization', name: 'IGN / ANCT / La Poste' }, license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence' },
    { '@type': 'Dataset', name: 'Plan Cadastral Informatisé (PCI)', description: 'Représentation numérique du cadastre français : 62 millions de parcelles avec identifiants, sections et contenances.', url: 'https://www.data.gouv.fr/fr/datasets/plan-cadastral-informatise/', creator: { '@type': 'Organization', name: 'DGFiP / IGN' }, license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence' },
    { '@type': 'Dataset', name: 'Demandes de Valeurs Foncières (DVF)', description: 'Ensemble des transactions immobilières enregistrées en France depuis 2014 : prix, surfaces, types de biens.', url: 'https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/', creator: { '@type': 'Organization', name: 'DGFiP' }, license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence' },
    { '@type': 'Dataset', name: 'Diagnostics de Performance Énergétique (DPE)', description: 'Diagnostics énergétiques des logements existants en France : étiquettes A–G, consommation primaire, émissions GES.', url: 'https://data.ademe.fr/datasets/dpe-v2-logements-existants', creator: { '@type': 'Organization', name: 'ADEME' }, license: 'https://www.etalab.gouv.fr/licence-ouverte-open-licence' },
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
