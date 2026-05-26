'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Layers, ChevronDown, ChevronUp } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Link from 'next/link'
import InfoPanel from './InfoPanel'
import GeocopiaHeader from '@/components/GeocopiaHeader'
import type { BanFeature } from '@/components/SearchBar'
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
    `rgba(148,163,184,${opacity + 0.05})`,
    `rgba(245,158,11,${opacity})`,
  ]
}

function adminLineColor(deptProp: string): maplibregl.ExpressionSpecification {
  return [
    'case',
    ['in', ['get', deptProp], ['literal', ALSACE_MOSELLE]],
    'rgba(148,163,184,0.7)',
    'rgba(180,83,9,0.65)',
  ]
}


interface InitialFocus {
  lat: number
  lon: number
  zoom: number
  parcelleId?: string
}

export default function MapView({ initialFocus }: { initialFocus?: InitialFocus }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const initialFocusRef = useRef(initialFocus)
  const [activeBase, setActiveBase] = useState<BaseMapId>('osm')
  const [visibleOverlays, setVisibleOverlays] = useState<Set<OverlayId>>(new Set(['admin', 'parcelles']))
  const [parcelle, setParcelle] = useState<Parcelle | null>(null)
  const [loading, setLoading] = useState(false)
  const [layersOpen, setLayersOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768)
  const [mapReady, setMapReady] = useState(false)

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
        paint: { 'fill-color': 'rgba(245,158,11,0.15)', 'fill-outline-color': 'rgba(180,83,9,0.6)' },
      },
      // Régions — contour (plus épais)
      {
        id: 'regions-line',
        type: 'line' as const,
        source: 'admin-regions',
        'source-layer': 'regions',
        minzoom: 4, maxzoom: 8,
        paint: { 'line-color': 'rgba(180,83,9,0.75)', 'line-width': 2 },
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
          'fill-color': 'rgba(245,158,11,0.45)',
          'fill-outline-color': '#d97706',
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

    // Drill-down : clic région → zoom 8
    map.on('click', 'regions-fill', (e) => {
      map.flyTo({ center: e.lngLat, zoom: 8 })
    })

    // Drill-down : clic département → zoom 11
    map.on('click', 'departements-fill', (e) => {
      map.flyTo({ center: e.lngLat, zoom: 11 })
    })

    // Drill-down : clic commune → zoom 16
    map.on('click', 'communes-fill', (e) => {
      map.flyTo({ center: e.lngLat, zoom: 16 })
    })

    // Clic parcelle → InfoPanel + mise à jour URL
    map.on('click', 'parcelles-fill', async (e) => {
      const feature = e.features?.[0]
      const parcelleId = feature?.properties?.id as string | undefined
      if (!parcelleId) return
      map.setFilter('parcelles-selected', ['==', ['get', 'id'], parcelleId])
      const url = new URL(window.location.href)
      url.searchParams.set('lat', e.lngLat.lat.toFixed(6))
      url.searchParams.set('lon', e.lngLat.lng.toFixed(6))
      url.searchParams.set('zoom', String(Math.round(map.getZoom())))
      url.searchParams.set('parcelle', parcelleId)
      window.history.replaceState(null, '', url.toString())
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

    map.once('load', () => setMapReady(true))

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // Fetch parcelle immédiatement au montage — n'attend pas la carte
  useEffect(() => {
    const focus = initialFocusRef.current
    if (!focus?.parcelleId) return
    setLoading(true)
    fetch(`${API_URL}/api/parcelles/${focus.parcelleId}`, { headers: { Accept: 'application/ld+json' } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setParcelle(data) })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Positionne la carte quand elle est prête (visuel uniquement)
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    const focus = initialFocusRef.current
    if (!focus) return
    map.jumpTo({ center: [focus.lon, focus.lat], zoom: focus.zoom })
    if (focus.parcelleId) {
      map.setFilter('parcelles-selected', ['==', ['get', 'id'], focus.parcelleId])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady])

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
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>

      {/* ── App Header ────────────────────────────────────────────── */}
      <GeocopiaHeader onSearchSelect={handleSearchSelect} activeRoute="carte" />

      {/* ── Map area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Layer switcher — top-left */}
        <div style={{
          position: 'absolute', top: 16, left: 16, zIndex: 3,
          background: 'white', border: '1px solid var(--slate-200)',
          borderRadius: 6, width: 220,
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        }}>
          <button
            onClick={() => setLayersOpen(o => !o)}
            style={{
              width: '100%', padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent', border: 0,
              color: 'var(--slate-900)', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Layers size={14} style={{ color: 'var(--slate-500)', flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Couches</span>
            {layersOpen ? <ChevronUp size={14} style={{ color: 'var(--slate-400)' }} /> : <ChevronDown size={14} style={{ color: 'var(--slate-400)' }} />}
          </button>

          {layersOpen && (
            <>
              <div style={{ height: 1, background: 'var(--slate-200)' }} />

              {/* Base maps */}
              <div style={{ padding: '8px 8px 6px' }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--slate-500)',
                  padding: '0 4px 6px',
                }}>Fond</div>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {BASE_MAP_IDS.map((id) => (
                    <button
                      key={id}
                      onClick={() => switchBase(id)}
                      style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500,
                        border: '1px solid transparent',
                        background: activeBase === id ? 'var(--slate-900)' : 'var(--slate-50)',
                        color: activeBase === id ? 'white' : 'var(--slate-600)',
                        cursor: 'pointer', fontFamily: 'inherit',
                        borderColor: activeBase === id ? 'var(--slate-900)' : 'var(--slate-200)',
                      }}
                    >
                      {BASE_MAPS[id].label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--slate-100)', margin: '0 8px' }} />

              {/* Overlay toggles */}
              <div style={{ padding: '6px 4px 8px' }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--slate-500)',
                  padding: '0 8px 6px',
                }}>Données</div>
                {(Object.keys(OVERLAYS) as OverlayId[]).map((id) => (
                  <label key={id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px', fontSize: 13,
                    color: 'var(--slate-700)', cursor: 'pointer',
                    borderRadius: 4,
                    background: visibleOverlays.has(id) ? 'var(--slate-50)' : 'transparent',
                  }}>
                    <input
                      type="checkbox"
                      checked={visibleOverlays.has(id)}
                      onChange={() => toggleOverlay(id)}
                      style={{ accentColor: 'var(--slate-900)', cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1 }}>{OVERLAYS[id].label}</span>
                    {OVERLAYS[id].minZoomHint && visibleOverlays.has(id) && (
                      <span style={{ fontSize: 11, color: 'var(--slate-400)', fontFamily: 'var(--font-mono)' }}>
                        {OVERLAYS[id].minZoomHint}+
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Légende DVF */}
        {visibleOverlays.has('dvf') && (
          <div style={{
            position: 'absolute', bottom: 10, left: 16, zIndex: 3,
            background: 'white', border: '1px solid var(--slate-200)',
            borderRadius: 6, padding: '10px 12px',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--slate-700)' }}>Prix/m² (DVF)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[
                { color: '#4ade80', label: '< 2 000 €' },
                { color: '#86efac', label: '2 000 – 3 500 €' },
                { color: '#fde047', label: '3 500 – 5 500 €' },
                { color: '#fb923c', label: '5 500 – 8 000 €' },
                { color: '#ef4444', label: '8 000 – 12 000 €' },
                { color: '#9333ea', label: '> 12 000 €' },
                { color: '#aaaaaa', label: 'Inconnu' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--slate-600)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Légende DPE */}
        {visibleOverlays.has('dpe') && !visibleOverlays.has('dvf') && (
          <div style={{
            position: 'absolute', bottom: 10, left: 16, zIndex: 3,
            background: 'white', border: '1px solid var(--slate-200)',
            borderRadius: 6, padding: '10px 12px',
            boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--slate-700)' }}>Étiquette DPE</p>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['A','B','C','D','E','F','G'] as const).map((l) => (
                <span
                  key={l}
                  style={{
                    width: 20, height: 20, borderRadius: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'white',
                    background: { A:'#319834',B:'#33CC33',C:'#CACC32',D:'#FBCA01',E:'#FB9A00',F:'#FB6A01',G:'#E9161C' }[l],
                  }}
                >{l}</span>
              ))}
            </div>
          </div>
        )}

        {(parcelle || loading) && (
          <InfoPanel parcelle={parcelle} loading={loading} onClose={closePanel} />
        )}

        {/* Mentions légales — bas de carte */}
        <div style={{ position: 'absolute', bottom: 6, right: 8, zIndex: 3 }}>
          <Link
            href="/mentions-legales"
            style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', textDecoration: 'none', background: 'rgba(255,255,255,0.75)', padding: '2px 6px', borderRadius: 3 }}
          >
            Mentions légales
          </Link>
        </div>

      </div>
    </div>
  )
}
