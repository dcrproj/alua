'use client'

import dynamic from 'next/dynamic'

const AddressMap = dynamic(() => import('./AddressMap'), { ssr: false })

interface Props {
  lon: number
  lat: number
}

export default function AddressMapWrapper(props: Props) {
  return <AddressMap {...props} />
}
