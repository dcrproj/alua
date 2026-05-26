import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function isLoopback(req: NextRequest): boolean {
  // Appel direct loopback (Symfony → 127.0.0.1:3001 sans passer par Nginx) :
  // aucun header X-Real-IP/X-Forwarded-For → on considère que c'est loopback.
  const realIp = req.headers.get('x-real-ip')
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
  if (!realIp && !forwarded) return true
  return LOOPBACK.has(realIp ?? '') || LOOPBACK.has(forwarded ?? '')
}

export async function POST(req: NextRequest) {
  // Restriction localhost — cet endpoint ne doit jamais être accessible depuis l'extérieur
  if (!isLoopback(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { tags?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tags = Array.isArray(body.tags) ? body.tags : []
  if (!tags.length) {
    return NextResponse.json({ error: 'No tags provided' }, { status: 400 })
  }

  for (const tag of tags) {
    revalidateTag(tag)
  }

  return NextResponse.json({ revalidated: true, tags })
}
