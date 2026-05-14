'use client'

import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/20 text-muted-foreground text-sm">
      Chargement de la carte…
    </div>
  ),
})

export default function MapWrapper() {
  return <MapView />
}
