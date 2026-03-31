'use client'

import { useState } from 'react'
import { useLang } from '@/contexts/LangContext'
import { weekendSpots } from '@/lib/weekendSpots'
import type { WeekendSpot } from '@/types/weekendSpot'
import { SpotAvatar } from './SpotAvatar'
import { IconCalendar } from '@/components/ui/Icons'

export function WeekendSpotsSection() {
  const { lang, t } = useLang()
  const [selectedSpot, setSelectedSpot] = useState<WeekendSpot | null>(null)

  const closeDetail = () => setSelectedSpot(null)

  return (
    <>
      <div className="px-4 mb-8">
        <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {/* compass */}
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f472b6,#8b5cf6)' }}>
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 3v1M8 12v1M3 8h1M12 8h1" />
                  <path d="M10.5 5.5L8.8 8.8 5.5 10.5 7.2 7.2Z" fill="white" stroke="none" />
                </svg>
              </span>
              {t('周邊資訊店', 'Nearby Info')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {weekendSpots.map((spot) => (
              <article
                key={spot.id}
                className="rounded-xl p-4 border"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--faint)',
                }}
              >
                <div className="flex items-start gap-3 mb-2">
                  <SpotAvatar categoryZh={spot.categoryZh} />
                  <div>
                    <div className="text-base font-semibold leading-tight">
                      {lang === 'zh' ? spot.titleZh : spot.titleEn}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--muted)' }}>
                      {lang === 'zh' ? spot.cityZh : spot.cityEn} · {lang === 'zh' ? spot.categoryZh : spot.categoryEn}
                    </div>
                  </div>
                </div>

                <p className="text-sm mb-2" style={{ color: 'var(--text)' }}>
                  {lang === 'zh' ? spot.summaryZh : spot.summaryEn}
                </p>

                <p className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                  <IconCalendar className="w-3 h-3 flex-shrink-0" />
                  {lang === 'zh' ? spot.whenZh : spot.whenEn}
                </p>

                <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                  <a
                    href={spot.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                    style={{ color: 'var(--accent3)' }}
                  >
                    {t('官方連結', 'Official Link')}
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedSpot(spot)}
                    className="px-3 py-1 rounded-full border text-xs"
                    style={{ borderColor: 'var(--faint)', background: 'var(--surface)' }}
                  >
                    {t('周邊詳情', 'Merch Details')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {selectedSpot && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={closeDetail} />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[560px] rounded-t-3xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <SpotAvatar categoryZh={selectedSpot.categoryZh} size="md" />
                <div>
                  <h3 className="text-xl font-bold">
                    {lang === 'zh' ? selectedSpot.titleZh : selectedSpot.titleEn}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {lang === 'zh' ? selectedSpot.cityZh : selectedSpot.cityEn} · {lang === 'zh' ? selectedSpot.categoryZh : selectedSpot.categoryEn}
                  </p>
                </div>
              </div>
              <button type="button" onClick={closeDetail} className="w-8 h-8 rounded-full" style={{ background: 'var(--faint)' }}>
                ✕
              </button>
            </div>

            <p className="text-sm mb-3">{lang === 'zh' ? selectedSpot.detailZh : selectedSpot.detailEn}</p>
            <p className="text-xs mb-4 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
              <IconCalendar className="w-3 h-3 flex-shrink-0" />
              {lang === 'zh' ? selectedSpot.whenZh : selectedSpot.whenEn}
            </p>

            <h4 className="font-semibold mb-2">{t('在哪裡賣', 'Where to Buy')}</h4>
            <div className="space-y-2 mb-4">
              {selectedSpot.buyChannels.map((channel) => (
                <a
                  key={channel.url + channel.nameZh}
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-3 rounded-xl border"
                  style={{ borderColor: 'var(--faint)', background: 'var(--card)' }}
                >
                  <div className="font-medium" style={{ color: 'var(--accent3)' }}>
                    {lang === 'zh' ? channel.nameZh : channel.nameEn} ↗
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    {lang === 'zh' ? channel.noteZh : channel.noteEn}
                  </p>
                </a>
              ))}
            </div>

            <a
              href={selectedSpot.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm underline"
              style={{ color: 'var(--accent3)' }}
            >
              {t('查看官方來源', 'View Official Source')}
            </a>
          </div>
        </div>
      )}
    </>
  )
}