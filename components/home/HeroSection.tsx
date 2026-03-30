'use client'

import { useLang } from '@/contexts/LangContext'

export function HeroSection() {
  const { t } = useLang()

  return (
    <div className="py-8 text-center">
      <h1 className="text-4xl font-bold mb-3">
        {t('台灣演唱會資訊', 'Taiwan Concerts')}
      </h1>
      <p className="text-lg mb-6" style={{ color: 'var(--muted)' }}>
        {t('即時掌握最新演出訊息', 'Stay updated with the latest shows')}
      </p>
    </div>
  )
}
