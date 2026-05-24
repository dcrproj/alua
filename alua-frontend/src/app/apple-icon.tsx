import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  const fontData = await readFile(path.join(process.cwd(), 'public/fonts/syne-bold.ttf'))

  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          borderRadius: 40,
          color: '#f59e0b',
          fontSize: 124,
          fontWeight: 700,
          fontFamily: 'Syne',
          letterSpacing: '-0.02em',
          paddingBottom: 6,
        }}
      >
        g
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Syne', data: fontData, weight: 700, style: 'normal' }],
    }
  )
}
