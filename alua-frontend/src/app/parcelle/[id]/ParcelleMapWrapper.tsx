'use client'

import dynamic from 'next/dynamic'

const ParcelleMap = dynamic(() => import('./ParcelleMap'), { ssr: false })

interface Props {
  lon: number
  lat: number
  parcelleId: string
}

export default function ParcelleMapWrapper(props: Props) {
  return <ParcelleMap {...props} />
}
