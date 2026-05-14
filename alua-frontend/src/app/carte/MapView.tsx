'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import InfoPanel from './InfoPanel'
import type { Parcelle } from '@/types/api'

const MARTIN_URL = process.env.NEXT_PUBLIC_MARTIN_URL!
const API_URL = process.env.NEXT_PUBLIC_API_URL!

type BaseMapId = 'osm' | 'ign' | 'satellite' | 'cadastre'

const BASE_MAPS: Record<BaseMapId, { label: string; tiles: string[]; attribution: string }> = {
  osm: {
    label: 'OSM',
    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  ign: {
    label: 'IGN',
    tiles: ['https://data.geopf.fr/wmts?layer=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng&TileMatrix={z}&TileCol={x}&TileRow={y}'],
    attribution: '© <a href="https://geoservices.ign.fr">IGN</a>',
  },
  satellite: {
    label: 'Satellite',
    tiles: ['https://data.geopf.fr/wmts?layer=ORTHOIMAGERY.ORTHOPHOTOS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}'],
    attribution: '© <a href="https://geoservices.ign.fr">IGN</a>',
  },
  cadastre: {
    label: 'Cadastre',
    tiles: ['https://data.geopf.fr/wmts?layer=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&style=normal&tilematrixset=PM&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fpng&TileMatrix={z}&TileCol={x}&TileRow={y}'],
    attribution: '© <a href="https://geoservices.ign.fr">IGN</a>',
  },
}

const BASE_MAP_IDS = Object.keys(BASE_MAPS) as BaseMapId[]

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [activeBase, setActiveBase] = useState<BaseMapId>('osm')
  const [parcelle, setParcelle] = useState<Parcelle | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const sources: maplibregl.StyleSpecification['sources'] = {
      parcelles: {
        type: 'vector',
        tiles: [`${MARTIN_URL}/france-parcelles/{z}/{x}/{y}`],
        minzoom: 12,
        maxzoom: 18,
      },
    }
    BASE_MAP_IDS.forEach((id) => {
      sources[`base-${id}`] = {
        type: 'raster',
        tiles: BASE_MAPS[id].tiles,
        tileSize: 256,
        attribution: BASE_MAPS[id].attribution,
      }
    })

    const layers: maplibregl.LayerSpecification[] = [
      // Base rasters — OSM visible par défaut, les autres cachés
      ...BASE_MAP_IDS.map((id) => ({
        id: `base-${id}`,
        type: 'raster' as const,
        source: `base-${id}`,
        layout: { visibility: (id === 'osm' ? 'visible' : 'none') as 'visible' | 'none' },
      })),
      // Parcelles fill
      {
        id: 'parcelles-fill',
        type: 'fill' as const,
        source: 'parcelles',
        'source-layer': 'parcelles',
        minzoom: 15,
        paint: {
          'fill-color': 'rgba(255, 200, 60, 0.2)',
          'fill-outline-color': '#c8860a',
        },
      },
      // Parcelle sélectionnée
      {
        id: 'parcelles-selected',
        type: 'fill' as const,
        source: 'parcelles',
        'source-layer': 'parcelles',
        minzoom: 15,
        paint: {
          'fill-color': 'rgba(59, 130, 246, 0.45)',
          'fill-outline-color': '#1d4ed8',
        },
        filter: ['==', ['get', 'id'], ''] as maplibregl.FilterSpecification,
      },
    ]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: { version: 8, sources, layers },
      center: [2.35, 46.8],
      zoom: 5,
      minZoom: 4,
      maxBounds: [[-6, 41], [10, 52]],
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    map.on('click', 'parcelles-fill', async (e) => {
      const feature = e.features?.[0]
      const parcelleId = feature?.properties?.id as string | undefined
      if (!parcelleId) return

      map.setFilter('parcelles-selected', ['==', ['get', 'id'], parcelleId])
      setLoading(true)
      setParcelle(null)
      try {
        const res = await fetch(`${API_URL}/api/parcelles/${parcelleId}`, {
          headers: { Accept: 'application/ld+json' },
        })
        if (res.ok) setParcelle(await res.json())
      } finally {
        setLoading(false)
      }
    })

    map.on('mouseenter', 'parcelles-fill', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'parcelles-fill', () => { map.getCanvas().style.cursor = '' })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  const switchBase = useCallback((id: BaseMapId) => {
    const map = mapRef.current
    if (!map) return
    BASE_MAP_IDS.forEach((b) => {
      map.setLayoutProperty(`base-${b}`, 'visibility', b === id ? 'visible' : 'none')
    })
    setActiveBase(id)
  }, [])

  const closePanel = useCallback(() => {
    setParcelle(null)
    setLoading(false)
    mapRef.current?.setFilter('parcelles-selected', ['==', ['get', 'id'], ''])
  }, [])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Sélecteur de fond de carte */}
      <div className="absolute top-4 left-4 z-10 flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-md">
        {BASE_MAP_IDS.map((id) => (
          <button
            key={id}
            onClick={() => switchBase(id)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeBase === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {BASE_MAPS[id].label}
          </button>
        ))}
      </div>

      {/* Panneau latéral */}
      {(parcelle || loading) && (
        <InfoPanel parcelle={parcelle} loading={loading} onClose={closePanel} />
      )}
    </div>
  )
}
