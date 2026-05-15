'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import InfoPanel from './InfoPanel'
import SearchBar, { type BanFeature } from '@/components/SearchBar'
import type { Parcelle } from '@/types/api'

const MARTIN_URL = process.env.NEXT_PUBLIC_MARTIN_URL!
const API_URL = process.env.NEXT_PUBLIC_API_URL!

const ALSACE_MOSELLE = ['57', '67', '68']

type BaseMapId = 'osm' | 'ign' | 'satellite' | 'cadastre'
type OverlayId = 'admin' | 'parcelles' | 'dvf' | 'dpe'

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

const OVERLAYS: Record<OverlayId, { label: string; minZoomHint?: number }> = {
  admin:     { label: 'Limites admin.' },
  parcelles: { label: 'Parcelles',    minZoomHint: 15 },
  dvf:       { label: 'Prix DVF',     minZoomHint: 10 },
  dpe:       { label: 'DPE',          minZoomHint: 12 },
}

// Prix/m² → couleur (step expression)
const DVF_COLOR_EXPR: maplibregl.ExpressionSpecification = [
  'step', ['coalesce', ['get', 'prix_m2'], 0],
  '#aaaaaa',    //  0 (null/0)
  500,  '#4ade80',   // vert clair    500–2 000
  2000, '#86efac',   //               2 000–3 500
  3500, '#fde047',   // jaune         3 500–5 500
  5500, '#fb923c',   // orange        5 500–8 000
  8000, '#ef4444',   // rouge         8 000–12 000
  12000,'#9333ea',   // violet        > 12 000
]

// Étiquette DPE → couleur
const DPE_COLOR_EXPR: maplibregl.ExpressionSpecification = [
  'match', ['get', 'etiquette_dpe'],
  'A', '#319834', 'B', '#33CC33', 'C', '#CACC32',
  'D', '#FBCA01', 'E', '#FB9A00', 'F', '#FB6A01', 'G', '#E9161C',
  '#888888',
]

// Couleur de remplissage admin selon Alsace-Moselle
function adminFillColor(deptProp: string, opacity: number): maplibregl.ExpressionSpecification {
  return [
    'case',
    ['in', ['get', deptProp], ['literal', ALSACE_MOSELLE]],
    `rgba(160,160,160,${opacity + 0.05})`,
    `rgba(99,131,230,${opacity})`,
  ]
}

function adminLineColor(deptProp: string): maplibregl.ExpressionSpecification {
  return [
    'case',
    ['in', ['get', deptProp], ['literal', ALSACE_MOSELLE]],
    'rgba(100,100,100,0.7)',
    'rgba(59,100,210,0.7)',
  ]
}

// Calcule le centre d'une géométrie GeoJSON
function geomCenter(geom: GeoJSON.Geometry): [number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  const scanRing = (ring: number[][]) => {
    ring.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng
      if (lat < minLat) minLat = lat
      if (lng > maxLng) maxLng = lng
      if (lat > maxLat) maxLat = lat
    })
  }
  const scanPoly = (poly: number[][][]) => poly.forEach(scanRing)
  if (geom.type === 'Polygon') scanPoly(geom.coordinates)
  else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(scanPoly)
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [activeBase, setActiveBase] = useState<BaseMapId>('osm')
  const [visibleOverlays, setVisibleOverlays] = useState<Set<OverlayId>>(new Set(['admin', 'parcelles']))
  const [parcelle, setParcelle] = useState<Parcelle | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const sources: maplibregl.StyleSpecification['sources'] = {
      // Admin boundaries
      'admin-regions': {
        type: 'vector',
        tiles: [`${MARTIN_URL}/regions/{z}/{x}/{y}`],
        minzoom: 0, maxzoom: 12,
      },
      'admin-departements': {
        type: 'vector',
        tiles: [`${MARTIN_URL}/departements/{z}/{x}/{y}`],
        minzoom: 0, maxzoom: 12,
      },
      'admin-communes': {
        type: 'vector',
        tiles: [`${MARTIN_URL}/communes/{z}/{x}/{y}`],
        minzoom: 7, maxzoom: 14,
      },
      // Data layers
      parcelles: {
        type: 'vector',
        tiles: [`${MARTIN_URL}/france-parcelles/{z}/{x}/{y}`],
        minzoom: 12, maxzoom: 18,
      },
      dvf: {
        type: 'vector',
        tiles: [`${MARTIN_URL}/view_transactions_tiles/{z}/{x}/{y}`],
        minzoom: 8, maxzoom: 18,
      },
      dpe: {
        type: 'vector',
        tiles: [`${MARTIN_URL}/view_dpe_tiles/{z}/{x}/{y}`],
        minzoom: 10, maxzoom: 18,
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
      // Fonds de carte
      ...BASE_MAP_IDS.map((id) => ({
        id: `base-${id}`,
        type: 'raster' as const,
        source: `base-${id}`,
        layout: { visibility: (id === 'osm' ? 'visible' : 'none') as 'visible' | 'none' },
      })),

      // ── Limites administratives ──────────────────────────────────

      // Régions — fill (zoom 4–7)
      {
        id: 'regions-fill',
        type: 'fill' as const,
        source: 'admin-regions',
        'source-layer': 'regions',
        minzoom: 4, maxzoom: 7,
        paint: { 'fill-color': 'rgba(99,131,230,0.22)', 'fill-outline-color': 'rgba(59,100,210,0.7)' },
      },
      // Régions — contour (plus épais)
      {
        id: 'regions-line',
        type: 'line' as const,
        source: 'admin-regions',
        'source-layer': 'regions',
        minzoom: 4, maxzoom: 8,
        paint: { 'line-color': 'rgba(59,100,210,0.8)', 'line-width': 2 },
      },

      // Départements — fill (zoom 7–10)
      {
        id: 'departements-fill',
        type: 'fill' as const,
        source: 'admin-departements',
        'source-layer': 'departements',
        minzoom: 7, maxzoom: 10,
        paint: { 'fill-color': adminFillColor('code', 0.18), 'fill-outline-color': adminLineColor('code') },
      },
      // Départements — contour
      {
        id: 'departements-line',
        type: 'line' as const,
        source: 'admin-departements',
        'source-layer': 'departements',
        minzoom: 7, maxzoom: 11,
        paint: { 'line-color': adminLineColor('code'), 'line-width': 1.5 },
      },

      // Communes — fill (zoom 10–14)
      {
        id: 'communes-fill',
        type: 'fill' as const,
        source: 'admin-communes',
        'source-layer': 'communes',
        minzoom: 10, maxzoom: 14,
        paint: { 'fill-color': adminFillColor('code_departement', 0.13), 'fill-outline-color': adminLineColor('code_departement') },
      },
      // Communes — contour
      {
        id: 'communes-line',
        type: 'line' as const,
        source: 'admin-communes',
        'source-layer': 'communes',
        minzoom: 10, maxzoom: 15,
        paint: { 'line-color': adminLineColor('code_departement'), 'line-width': 0.8 },
      },

      // ── Données ──────────────────────────────────────────────────

      // DVF — cercles colorés par prix/m²
      {
        id: 'dvf-circles',
        type: 'circle' as const,
        source: 'dvf',
        'source-layer': 'view_transactions_tiles',
        minzoom: 10,
        layout: { visibility: 'none' },
        paint: {
          'circle-color': DVF_COLOR_EXPR,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2, 15, 6],
          'circle-opacity': 0.8,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': 'rgba(0,0,0,0.2)',
        },
      },
      // DPE — cercles colorés par étiquette
      {
        id: 'dpe-circles',
        type: 'circle' as const,
        source: 'dpe',
        'source-layer': 'view_dpe_tiles',
        minzoom: 12,
        layout: { visibility: 'none' },
        paint: {
          'circle-color': DPE_COLOR_EXPR,
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 7],
          'circle-opacity': 0.85,
          'circle-stroke-width': 0.5,
          'circle-stroke-color': 'rgba(0,0,0,0.2)',
        },
      },
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

    // Drill-down : clic région → zoom 8 (départements visibles à minzoom 7)
    map.on('click', 'regions-fill', (e) => {
      const geom = e.features?.[0]?.geometry
      if (!geom) return
      map.flyTo({ center: geomCenter(geom as GeoJSON.Geometry), zoom: 8 })
    })

    // Drill-down : clic département → zoom 11 (communes visibles à minzoom 10)
    map.on('click', 'departements-fill', (e) => {
      const geom = e.features?.[0]?.geometry
      if (!geom) return
      map.flyTo({ center: geomCenter(geom as GeoJSON.Geometry), zoom: 11 })
    })

    // Drill-down : clic commune → zoom 16 (parcelles visibles à minzoom 15)
    map.on('click', 'communes-fill', (e) => {
      const geom = e.features?.[0]?.geometry
      if (!geom) return
      map.flyTo({ center: geomCenter(geom as GeoJSON.Geometry), zoom: 16 })
    })

    // Clic parcelle → InfoPanel
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

    // Curseurs
    const pointerLayers = [
      'regions-fill', 'departements-fill', 'communes-fill',
      'parcelles-fill', 'dvf-circles', 'dpe-circles',
    ]
    pointerLayers.forEach((layer) => {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
    })

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

  const toggleOverlay = useCallback((id: OverlayId) => {
    const map = mapRef.current
    if (!map) return
    const layerMap: Record<OverlayId, string[]> = {
      admin:     ['regions-fill', 'regions-line', 'departements-fill', 'departements-line', 'communes-fill', 'communes-line'],
      parcelles: ['parcelles-fill', 'parcelles-selected'],
      dvf:       ['dvf-circles'],
      dpe:       ['dpe-circles'],
    }
    setVisibleOverlays((prev) => {
      const next = new Set(prev)
      const visible = next.has(id)
      if (visible) { next.delete(id) } else { next.add(id) }
      layerMap[id].forEach((layer) => {
        map.setLayoutProperty(layer, 'visibility', visible ? 'none' : 'visible')
      })
      return next
    })
  }, [])

  const closePanel = useCallback(() => {
    setParcelle(null)
    setLoading(false)
    mapRef.current?.setFilter('parcelles-selected', ['==', ['get', 'id'], ''])
  }, [])

  const handleSearchSelect = useCallback((feature: BanFeature) => {
    if (!mapRef.current) return
    const zoom = feature.type === 'municipality' ? 12 : feature.type === 'street' ? 16 : 17
    mapRef.current.flyTo({ center: [feature.lon, feature.lat], zoom, duration: 800 })
  }, [])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Barre de recherche centrée en haut */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-80 sm:w-96">
        <SearchBar onSelect={handleSearchSelect} />
      </div>

      {/* Contrôles en haut à gauche */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {/* Fond de carte */}
        <div className="flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-md">
          {BASE_MAP_IDS.map((id) => (
            <button
              key={id}
              onClick={() => switchBase(id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeBase === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {BASE_MAPS[id].label}
            </button>
          ))}
        </div>

        {/* Couches */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md flex flex-col gap-1">
          {(Object.keys(OVERLAYS) as OverlayId[]).map((id) => (
            <label key={id} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={visibleOverlays.has(id)}
                onChange={() => toggleOverlay(id)}
                className="rounded"
              />
              <span className="text-xs font-medium text-foreground">{OVERLAYS[id].label}</span>
              {OVERLAYS[id].minZoomHint && visibleOverlays.has(id) && (
                <span className="text-xs text-muted-foreground/60">zoom {OVERLAYS[id].minZoomHint}+</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Légende DVF */}
      {visibleOverlays.has('dvf') && (
        <div className="absolute bottom-10 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md">
          <p className="text-xs font-medium mb-1">Prix/m² (DVF)</p>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {[
              { color: '#4ade80', label: '< 2 000 €' },
              { color: '#86efac', label: '2 000 – 3 500 €' },
              { color: '#fde047', label: '3 500 – 5 500 €' },
              { color: '#fb923c', label: '5 500 – 8 000 €' },
              { color: '#ef4444', label: '8 000 – 12 000 €' },
              { color: '#9333ea', label: '> 12 000 €' },
              { color: '#aaaaaa', label: 'Inconnu' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Légende DPE */}
      {visibleOverlays.has('dpe') && (
        <div className="absolute bottom-10 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-md">
          <p className="text-xs font-medium mb-1">Étiquette DPE</p>
          <div className="flex gap-1">
            {(['A','B','C','D','E','F','G'] as const).map((l) => (
              <span
                key={l}
                className="w-5 h-5 rounded text-white text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: { A:'#319834',B:'#33CC33',C:'#CACC32',D:'#FBCA01',E:'#FB9A00',F:'#FB6A01',G:'#E9161C' }[l] }}
              >{l}</span>
            ))}
          </div>
        </div>
      )}

      {(parcelle || loading) && (
        <InfoPanel parcelle={parcelle} loading={loading} onClose={closePanel} />
      )}
    </div>
  )
}
