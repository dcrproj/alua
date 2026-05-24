'use client'

import { useSearchParams } from 'next/navigation'
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
  const params = useSearchParams()
  const lat = params.get('lat')
  const lon = params.get('lon')
  const zoom = params.get('zoom')
  const parcelleId = params.get('parcelle') ?? undefined

  const initialFocus =
    lat && lon
      ? { lat: parseFloat(lat), lon: parseFloat(lon), zoom: zoom ? parseFloat(zoom) : 18, parcelleId }
      : undefined

  return <MapView initialFocus={initialFocus} />
}
