import type { Metadata } from 'next'
import MapWrapper from './MapWrapper'

export const metadata: Metadata = { title: 'Carte' }

export default function CartePage() {
  return (
    <div className="flex-1 relative overflow-hidden">
      <MapWrapper />
    </div>
  )
}
