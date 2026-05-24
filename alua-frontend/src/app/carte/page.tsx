import { Suspense } from 'react'
import type { Metadata } from 'next'
import MapWrapper from './MapWrapper'

export const metadata: Metadata = {
  title: 'Carte interactive — Parcelles, transactions DVF et DPE',
  description: 'Explorez la carte des parcelles cadastrales françaises. Visualisez les transactions immobilières DVF, les diagnostics DPE et les données de chaque parcelle.',
}

export default function CartePage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Suspense>
        <MapWrapper />
      </Suspense>
    </div>
  )
}
