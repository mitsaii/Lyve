'use client'

import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { tagColor } from '@/lib/utils'

interface FeaturedCardProps {
  concert: Concert
  onClick: () => void
}

export function FeaturedCard({ concert, onClick }: FeaturedCardProps) {
  const { lang } = useLang()

  return (
    <div
      onClick={onClick}
      className="min-w-[280px] w-[280px] rounded-2xl cursor-pointer overflow-hidden relative active:opacity-80 transition-opacity card-bordered"
      style={{
        boxShadow: 'var(--shadow)',
        height: '200px'
      }}
    >
      {/* 背景圖片或漸層 */}
      {concert.image_url ? (
        <>
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${concert.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          {/* 深色遮罩 */}
          <div className="absolute inset-0 bg-black/40" />
          {/* 漸層覆蓋 */}
          <div 
            className="absolute inset-0"
            style={{
              background: concert.grad_css || 'transparent',
              opacity: 0.5,
              mixBlendMode: 'multiply'
            }}
          />
        </>
      ) : (
        <div 
          className="absolute inset-0"
          style={{
            background: concert.grad_css || 'var(--card)'
          }}
        />
      )}

      {/* 內容 */}
      <div className="relative h-full p-6 flex flex-col">
        <div className="mb-3">
          <h3 className="font-bold text-xl text-white drop-shadow-md">{concert.artist}</h3>
          <p className="text-sm opacity-90 text-white drop-shadow">
            {lang === 'zh' ? concert.city_zh : concert.city_en}
          </p>
        </div>

        <p className="text-white opacity-90 mb-3 line-clamp-2 drop-shadow flex-1">
          {lang === 'zh' ? concert.tour_zh : concert.tour_en}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-white opacity-90 text-sm drop-shadow flex items-center gap-1">
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 inline-block opacity-80" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="12" height="11" rx="2" />
              <path d="M10 1.5v3M6 1.5v3M2 7h12" />
              <circle cx="5.5" cy="10.5" r="0.7" fill="white" stroke="none" />
              <circle cx="8" cy="10.5" r="0.7" fill="white" stroke="none" />
              <circle cx="10.5" cy="10.5" r="0.7" fill="white" stroke="none" />
            </svg>
            {concert.date_str}
          </span>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"
            style={{
              background: tagColor(concert.status),
              color: '#000',
            }}
          >
            <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
              <path d="M6 0.8l1.3 3 3.2.4-2.3 2.3.5 3.1L6 8.1 3.3 9.6l.5-3.1L1.5 4.2l3.2-.4z" />
            </svg>
            HOT
          </span>
        </div>
      </div>
    </div>
  )
}
