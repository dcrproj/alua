import type { Commune, Parcelle, ApiCollection } from '@/types/api'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}/api${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/ld+json' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const api = {
  parcelle: (idParcelle: string) =>
    get<Parcelle>(`/parcelles/${idParcelle}`),

  address: (banId: string) =>
    get<Record<string, unknown>>(`/addresses/${banId}`),

  commune: (code: string) =>
    get<Commune>(`/communes/${code}`),

  transactions: (params: {
    commune?: string
    departement?: string
    nature?: string
    dateMin?: string
    dateMax?: string
    page?: number
    itemsPerPage?: number
  }) => {
    const p: Record<string, string> = {}
    if (params.commune) p['commune'] = params.commune
    if (params.departement) p['departement'] = params.departement
    if (params.nature) p['nature'] = params.nature
    if (params.dateMin) p['dateMin'] = params.dateMin
    if (params.dateMax) p['dateMax'] = params.dateMax
    if (params.page) p['page'] = String(params.page)
    if (params.itemsPerPage) p['itemsPerPage'] = String(params.itemsPerPage)
    return get<ApiCollection<Record<string, unknown>>>('/transactions', p)
  },
}
