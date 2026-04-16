import type { Metadata, Viewport } from 'next'
import { Noto_Sans_TC, Space_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LangProvider } from '@/contexts/LangContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { SavedProvider } from '@/contexts/SavedContext'
import { AlertProvider } from '@/contexts/AlertContext'
import { Header } from '@/components/layout/Header'
import { TabBar } from '@/components/layout/TabBar'
import { Footer } from '@/components/layout/Footer'
import { ServiceWorkerRegistration } from '@/components/layout/ServiceWorkerRegistration'
import { Analytics } from '@vercel/analytics/react'

const notoSansTC = Noto_Sans_TC({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto-sans',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lyve-alpha.vercel.app'

export const metadata: Metadata = {
  title: {
    default: 'Lyve',
    template: '%s | Lyve',
  },
  description: '台灣演唱會資訊平台 — 即時掌握演唱會開賣時間、場地票價與搶票提醒',
  keywords: ['演唱會', '台灣', '演唱會資訊', '搶票', '購票', 'concert', 'Taiwan', 'live music'],
  authors: [{ name: 'Lyve' }],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Lyve — 台灣演唱會資訊平台',
    description: '即時掌握演唱會開賣時間、場地票價與搶票提醒',
    url: siteUrl,
    siteName: 'Lyve',
    locale: 'zh_TW',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/og-default.png`,
        width: 1200,
        height: 630,
        alt: 'Lyve — 台灣演唱會資訊平台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyve — 台灣演唱會資訊平台',
    description: '即時掌握演唱會開賣時間、場地票價與搶票提醒',
    images: [`${siteUrl}/og-default.png`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lyve',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.variable} ${spaceMono.variable}`}>
        <ServiceWorkerRegistration />
        <Analytics />
        <ThemeProvider>
          <LangProvider>
            <AuthProvider>
              <SavedProvider>
                <AlertProvider>
                  <div className="max-w-[480px] mx-auto min-h-screen" style={{ background: 'var(--bg)' }}>
                    <Header />
                    <div style={{ paddingTop: 'calc(7rem + env(safe-area-inset-top))', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
                      {children}
                      <Footer />
                    </div>
                    <TabBar />
                  </div>
                </AlertProvider>
              </SavedProvider>
            </AuthProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
