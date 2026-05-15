'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const MARTIN_URL = process.env.NEXT_PUBLIC_MARTIN_URL!

interface Props {
  lon: number
  lat: number
  parcelleId: string
}

export default function ParcelleMap({ lon, lat, parcelleId }: Props) {
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
          parcelles: {
            type: 'vector',
            tiles: [`${MARTIN_URL}/france-parcelles/{z}/{x}/{y}`],
            minzoom: 12, maxzoom: 18,
          },
        },
        layers: [
          { id: 'cadastre', type: 'raster', source: 'cadastre' },
          {
            id: 'parcelle-highlight',
            type: 'fill',
            source: 'parcelles',
            'source-layer': 'parcelles',
            minzoom: 14,
            paint: {
              'fill-color': 'rgba(59, 130, 246, 0.35)',
              'fill-outline-color': '#1d4ed8',
            },
            filter: ['==', ['get', 'id'], parcelleId],
          },
          {
            id: 'parcelle-outline',
            type: 'line',
            source: 'parcelles',
            'source-layer': 'parcelles',
            minzoom: 14,
            paint: {
              'line-color': '#1d4ed8',
              'line-width': 2,
            },
            filter: ['==', ['get', 'id'], parcelleId],
          },
        ],
      },
      center: [lon, lat],
      zoom: 17,
      interactive: true,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [lon, lat, parcelleId])

  return <div ref={containerRef} className="w-full h-full" />
}
