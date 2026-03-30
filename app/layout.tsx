import type { Metadata, Viewport } from 'next'
import { Noto_Serif_TC, Space_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LangProvider } from '@/contexts/LangContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { SavedProvider } from '@/contexts/SavedContext'
import { AlertProvider } from '@/contexts/AlertContext'
import { Header } from '@/components/layout/Header'
import { TabBar } from '@/components/layout/TabBar'
import { Footer } from '@/components/layout/Footer'

const notoSerifTC = Noto_Serif_TC({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-noto-serif',
})

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'Lyve',
  description: '台灣演唱會資訊平台 - 即時掌握最新演出訊息',
}

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSerifTC.variable} ${spaceMono.variable}`} style={{ fontFamily: '"Microsoft JhengHei", "微軟正黑體", sans-serif' }}>
        <ThemeProvider>
          <LangProvider>
            <AuthProvider>
              <SavedProvider>
                <AlertProvider>
                  <div className="max-w-[480px] mx-auto min-h-screen" style={{ background: 'var(--bg)' }}>
                    <Header />
                    <div className="pt-28" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
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
