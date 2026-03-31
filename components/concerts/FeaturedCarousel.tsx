'use client'

import { useEffect, useState, useCallback } from 'react'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { tagColor } from '@/lib/utils'

interface FeaturedCarouselProps {
  concerts: Concert[]
  onSelect: (concert: Concert) => void
}

export function FeaturedCarousel({ concerts, onSelect }: FeaturedCarouselProps) {
  const { lang } = useLang()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => {
    setCurrent(i => (i + 1) % concerts.length)
  }, [concerts.length])

  // 每 4 秒自動換一張
  useEffect(() => {
    if (paused || concerts.length <= 1) return
    const timer = setInterval(next, 4000)
    return () => clearInterval(timer)
  }, [next, paused, concerts.length])

  if (concerts.length === 0) return null

  const concert = concerts[current]

  return (
    <div
      className="relative mx-4 rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{ height: 220 }}
      onClick={() => onSelect(concert)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 背景圖 / 漸層 */}
      {concert.image_url ? (
        <>
          <div
            className="absolute inset-0 transition-all duration-700"
            style={{
              backgroundImage: `url(${concert.image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-black/45" />
          <div
            className="absolute inset-0"
            style={{
              background: concert.grad_css ?? 'transparent',
              opacity: 0.5,
              mixBlendMode: 'multiply',
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{ background: concert.grad_css ?? 'linear-gradient(135deg,#7c3aed,#db2777)' }}
        />
      )}

      {/* 內容 */}
      <div className="relative h-full p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background: tagColor(concert.status), color: '#000' }}
            >
              HOT
            </span>
            <span className="text-white/70 text-xs">
              {lang === 'zh' ? concert.city_zh : concert.city_en}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white drop-shadow-md leading-tight">
            {concert.artist}
          </h3>
          <p className="text-white/85 text-sm mt-1 drop-shadow line-clamp-1">
            {lang === 'zh' ? concert.tour_zh : concert.tour_en}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <span className="text-white/80 text-sm drop-shadow">
            📅 {concert.date_str}
          </span>

          {/* 輪播點 */}
          <div className="flex gap-1.5">
            {concerts.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setCurrent(i) }}
                className="rounded-full transition-all"
                style={{
                  width: i === current ? 18 : 6,
                  height: 6,
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 左右箭頭（只在 hover 時顯示） */}
      {concerts.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setCurrent(i => (i - 1 + concerts.length) % concerts.length) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.35)', color: '#fff' }}
          >
            ‹
          </button>
          <button
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.35)', color: '#fff' }}
          >
            ›
          </button>
        </>
      )}
    </div>
  )
}
