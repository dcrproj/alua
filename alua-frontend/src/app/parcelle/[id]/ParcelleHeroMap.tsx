'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const MARTIN_URL = process.env.NEXT_PUBLIC_MARTIN_URL!

interface Props {
  lat: number
  lon: number
  parcelleId: string
}

export default function ParcelleHeroMap({ lat, lon, parcelleId }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          ortho: {
            type: 'raster',
            tiles: ['https://data.geopf.fr/wmts?layer=ORTHOIMAGERY.ORTHOPHOTOS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'],
            tileSize: 256,
            attribution: '© IGN',
          },
          parcelles: {
            type: 'vector',
            tiles: [`${MARTIN_URL}/france-parcelles/{z}/{x}/{y}`],
            minzoom: 12,
            maxzoom: 18,
          },
        },
        layers: [
          { id: 'ortho-base', type: 'raster', source: 'ortho' },
          {
            id: 'parcelles-fill',
            type: 'fill',
            source: 'parcelles',
            'source-layer': 'parcelles',
            minzoom: 14,
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'id'], parcelleId],
                'rgba(245,158,11,0.35)',
                'rgba(0,0,0,0)',
              ],
              'fill-outline-color': [
                'case',
                ['==', ['get', 'id'], parcelleId],
                '#f59e0b',
                'rgba(255,255,255,0.2)',
              ],
            },
          },
        ],
      },
      center: [lon, lat],
      zoom: 17,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    return () => { map.remove() }
  }, [lat, lon, parcelleId])

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}
