'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  const [animKey, setAnimKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = useCallback((index: number) => {
    setCurrent(index)
    setAnimKey(k => k + 1)
  }, [])

  const next = useCallback(() => {
    goTo((prev => (prev + 1) % concerts.length)(current))
  }, [current, concerts.length, goTo])

  const prev = useCallback(() => {
    goTo((current - 1 + concerts.length) % concerts.length)
  }, [current, concerts.length, goTo])

  // 每 4 秒自動切換
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (paused || concerts.length <= 1) return
    timerRef.current = setInterval(() => {
      setCurrent(i => {
        const next = (i + 1) % concerts.length
        setAnimKey(k => k + 1)
        return next
      })
    }, 4000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [paused, concerts.length])

  if (concerts.length === 0) return null

  const concert = concerts[current]

  return (
    <div
      className="group relative mx-4 rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{ height: 220 }}
      onClick={() => onSelect(concert)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 所有幻燈片疊層，用 opacity 切換以產生淡入淡出效果 */}
      {concerts.map((c, i) => (
        <div
          key={c.id}
          className="absolute inset-0"
          style={{
            opacity: i === current ? 1 : 0,
            transition: 'opacity 0.6s ease',
            pointerEvents: i === current ? 'auto' : 'none',
          }}
        >
          {c.image_url ? (
            <>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${c.image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div className="absolute inset-0 bg-black/45" />
              {c.grad_css && (
                <div
                  className="absolute inset-0"
                  style={{ background: c.grad_css, opacity: 0.45, mixBlendMode: 'multiply' }}
                />
              )}
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: c.grad_css ?? 'linear-gradient(135deg,#7c3aed,#db2777)' }}
            />
          )}
        </div>
      ))}

      {/* 內容：用 key 觸發淡入動畫 */}
      <div key={animKey} className="relative h-full p-5 flex flex-col justify-between fade-up">
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
                onClick={e => { e.stopPropagation(); goTo(i) }}
                className="rounded-full transition-all duration-300"
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

      {/* 左右箭頭（hover 才顯示，需要 group class） */}
      {concerts.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-lg font-bold"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            ‹
          </button>
          <button
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-lg font-bold"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            ›
          </button>
        </>
      )}
    </div>
  )
}
