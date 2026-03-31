import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lyve',
    short_name: 'Lyve',
    description: '台灣演唱會資訊平台 - 即時掌握最新演出訊息',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'portrait',
    icons: [
      {
        src: '/lyve-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/lyve-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
