'use client'

import dynamic from 'next/dynamic'

const ParcelleHeroMap = dynamic(() => import('./ParcelleHeroMap'), { ssr: false })

export default function ParcelleHeroMapClient(props: { lat: number; lon: number; parcelleId: string }) {
  return <ParcelleHeroMap {...props} />
}
