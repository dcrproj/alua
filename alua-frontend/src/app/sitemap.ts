import type { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

const API_URL  = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alua.fr'

export async function generateSitemaps() {
  try {
    const res = await fetch(`${API_URL}/api/sitemap/parcelles/count`, { next: { revalidate: 86400 } })
    if (!res.ok) throw new Error()
    const { batches } = await res.json() as { batches: number }
    return [
      { id: 'communes' },
      ...Array.from({ length: batches }, (_, i) => ({ id: `parcelles-${i}` })),
    ]
  } catch {
    return [{ id: 'communes' }]
  }
}

export default async function sitemap(
  props: { id: Promise<string> }
): Promise<MetadataRoute.Sitemap> {
  const id = await props.id

  if (id === 'communes') {
    try {
      const res = await fetch(`${API_URL}/api/sitemap/communes`, { next: { revalidate: 86400 } })
      if (!res.ok) throw new Error()
      const codes = await res.json() as string[]
      return codes.map((code) => ({
        url: `${SITE_URL}/commune/${code}`,
        changeFrequency: 'monthly',
        priority: 0.8,
      }))
    } catch {
      return []
    }
  }

  if (id.startsWith('parcelles-')) {
    const batch = parseInt(id.replace('parcelles-', ''), 10)
    try {
      const res = await fetch(`${API_URL}/api/sitemap/parcelles/${batch}`, { next: { revalidate: 86400 } })
      if (!res.ok) throw new Error()
      const parcelles = await res.json() as string[]
      return parcelles.map((parcelleId) => ({
        url: `${SITE_URL}/parcelle/${parcelleId}`,
        changeFrequency: 'yearly',
        priority: 0.6,
      }))
    } catch {
      return []
    }
  }

  return []
}
