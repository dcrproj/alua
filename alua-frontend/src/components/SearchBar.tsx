'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, MapPin, Building2 } from 'lucide-react'

export interface BanFeature {
  id: string
  label: string
  type: 'housenumber' | 'street' | 'municipality' | 'locality'
  citycode: string
  city: string
  lon: number
  lat: number
}

interface Props {
  onSelect?: (feature: BanFeature) => void
  placeholder?: string
  className?: string
}

export default function SearchBar({ onSelect, placeholder = 'Rechercher une adresse, une commune…', className }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BanFeature[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setOpen(false); return }
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6`
      )
      const data = await res.json()
      const features: BanFeature[] = (data.features ?? []).map((f: { properties: Record<string, string>; geometry: { coordinates: number[] } }) => ({
        id: f.properties.id,
        label: f.properties.label,
        type: f.properties.type as BanFeature['type'],
        citycode: f.properties.citycode,
        city: f.properties.city,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      }))
      setResults(features)
      setOpen(features.length > 0)
      setActiveIndex(-1)
    } catch {
      // réseau indisponible, on ignore
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  const handleSelect = (feature: BanFeature) => {
    setQuery(feature.label)
    setOpen(false)
    setResults([])
    if (onSelect) {
      onSelect(feature)
    } else {
      if (feature.type === 'housenumber') {
        router.push(`/adresse/${feature.id}`)
      } else {
        router.push(`/commune/${feature.citycode}`)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const clear = () => {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className ?? ''}`}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <div className="flex items-center bg-white rounded-xl shadow-md border border-border/40 overflow-hidden">
        <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent min-w-0"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button onClick={clear} className="p-2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute top-full mt-1.5 w-full bg-white border border-border/40 rounded-xl shadow-lg z-50 overflow-hidden">
          {results.map((f, i) => (
            <li key={f.id}>
              <button
                className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                  i === activeIndex ? 'bg-muted/60' : 'hover:bg-muted/40'
                }`}
                onMouseDown={(e) => e.preventDefault()} // évite le blur avant le click
                onClick={() => handleSelect(f)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {f.type === 'municipality' ? (
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{f.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
