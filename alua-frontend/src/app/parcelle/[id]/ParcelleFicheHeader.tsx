'use client'

import { useRouter } from 'next/navigation'
import GeocopiaHeader from '@/components/GeocopiaHeader'
import type { BanFeature } from '@/components/SearchBar'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export default function ParcelleFicheHeader() {
  const router = useRouter()

  async function handleSearchSelect(feature: BanFeature) {
    if (feature.type === 'housenumber') {
      try {
        const res = await fetch(`${API_URL}/api/addresses/${feature.id}`, {
          headers: { Accept: 'application/ld+json' },
        })
        if (res.ok) {
          const address = await res.json()
          const parcelleId = address.parcelles?.[0]?.idParcelle
          if (parcelleId) {
            router.push(`/parcelle/${parcelleId}`)
            return
          }
        }
      } catch { /* fall through */ }
      router.push(`/adresse/${feature.id}`)
    } else {
      router.push(`/commune/${feature.citycode}`)
    }
  }

  return <GeocopiaHeader onSearchSelect={handleSearchSelect} />
}
