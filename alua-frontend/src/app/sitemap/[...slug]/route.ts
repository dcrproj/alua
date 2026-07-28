import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL  = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://geocopia.fr'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const name = slug.join('/')

  if (name === 'communes.xml') {
    try {
      const res = await fetch(`${API_URL}/api/sitemap/communes`)
      if (!res.ok) throw new Error()
      const codes = await res.json() as string[]
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${codes.map(code => `  <url><loc>${SITE_URL}/commune/${code}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`
      return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
    } catch {
      return new NextResponse('error', { status: 500 })
    }
  }

  const parcellesMatch = name.match(/^parcelles-(\d+)\.xml$/)
  if (parcellesMatch) {
    const batch = parseInt(parcellesMatch[1], 10)
    try {
      const res = await fetch(`${API_URL}/api/sitemap/parcelles/${batch}`)
      if (!res.ok) throw new Error()
      const ids = await res.json() as string[]
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ids.map(id => `  <url><loc>${SITE_URL}/parcelle/${id}</loc><changefreq>yearly</changefreq><priority>0.6</priority></url>`).join('\n')}
</urlset>`
      return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
    } catch {
      return new NextResponse('error', { status: 500 })
    }
  }

  if (name === 'pages.xml') {
    const staticPages = [
      { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
      { loc: `${SITE_URL}/regions`, priority: '0.9', changefreq: 'monthly' },
      { loc: `${SITE_URL}/open-data`, priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE_URL}/guides`, priority: '0.8', changefreq: 'monthly' },
      { loc: `${SITE_URL}/a-propos`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${SITE_URL}/mentions-legales`, priority: '0.4', changefreq: 'yearly' },
    ]
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => `  <url><loc>${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`).join('\n')}
</urlset>`
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
  }

  if (name === 'admin.xml') {
    try {
      const res = await fetch(`${API_URL}/api/sitemap/admin`)
      if (!res.ok) throw new Error()
      const { departements, regions } = await res.json() as { departements: string[]; regions: string[] }
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${departements.map(s => `  <url><loc>${SITE_URL}/departement/${s}</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>`).join('\n')}
${regions.map(s => `  <url><loc>${SITE_URL}/region/${s}</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>`).join('\n')}
</urlset>`
      return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
    } catch {
      return new NextResponse('error', { status: 500 })
    }
  }

  const adressesMatch = name.match(/^adresses-(\d{2,3})-(\d+)\.xml$/)
  if (adressesMatch) {
    const dept  = adressesMatch[1]
    const batch = parseInt(adressesMatch[2], 10)
    try {
      const res = await fetch(`${API_URL}/api/sitemap/adresses/${dept}/${batch}`)
      if (!res.ok) throw new Error()
      const ids = await res.json() as string[]
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ids.map(id => `  <url><loc>${SITE_URL}/adresse/${id}</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>`).join('\n')}
</urlset>`
      return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
    } catch {
      return new NextResponse('error', { status: 500 })
    }
  }

  return new NextResponse('Not found', { status: 404 })
}
