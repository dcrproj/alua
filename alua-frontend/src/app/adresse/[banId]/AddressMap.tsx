'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Props {
  lon: number
  lat: number
}

export default function AddressMap({ lon, lat }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          cadastre: {
            type: 'raster',
            tiles: ['https://data.geopf.fr/wmts?layer=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng&TileMatrix={z}&TileCol={x}&TileRow={y}'],
            tileSize: 256,
            attribution: '© IGN',
          },
        },
        layers: [
          { id: 'cadastre', type: 'raster', source: 'cadastre' },
        ],
      },
      center: [lon, lat],
      zoom: 17,
      interactive: true,
    })

    new maplibregl.Marker({ color: '#3b82f6' })
      .setLngLat([lon, lat])
      .addTo(map)

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [lon, lat])

  return <div ref={containerRef} className="w-full h-full" />
}
