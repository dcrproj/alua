import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL  = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'

export async function GET() {
  const urls: string[] = [`${SITE_URL}/sitemap/communes.xml`]

  try {
    const res = await fetch(`${API_URL}/api/sitemap/parcelles/count`)
    if (res.ok) {
      const { batches } = await res.json() as { batches: number }
      for (let i = 0; i < batches; i++) {
        urls.push(`${SITE_URL}/sitemap/parcelles-${i}.xml`)
      }
    }
  } catch { /* continuer sans les parcelles */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(loc => `  <sitemap><loc>${loc}</loc></sitemap>`).join('\n')}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
