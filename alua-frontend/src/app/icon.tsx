import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        g
      </div>
    ),
    { ...size }
  )
}
