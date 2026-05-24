import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import path from 'path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  const fontData = await readFile(path.join(process.cwd(), 'public/fonts/syne-bold.ttf'))

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          borderRadius: 8,
          color: '#f59e0b',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'Syne',
          letterSpacing: '-0.02em',
          paddingBottom: 1,
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
