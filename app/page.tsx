'use client'

import { useState, useEffect, useRef } from 'react'
import { Concert, Genre } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { HeroSection } from '@/components/home/HeroSection'
import { Countdown } from '@/components/home/Countdown'
import { ConcertSearchSection } from '@/components/home/ConcertSearchSection'
import { GenreChips } from '@/components/concerts/GenreChips'
import { FeaturedCard } from '@/components/concerts/FeaturedCard'
import { ConcertCard } from '@/components/concerts/ConcertCard'
import { ConcertModal } from '@/components/concerts/ConcertModal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { IconSparkle, IconMusic } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'
import { getVisiblePageItems } from '@/lib/utils'

export default function HomePage() {
  const { t } = useLang()
  const concertsPerPage = 10
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [filteredConcerts, setFilteredConcerts] = useState<Concert[]>([])
  const [selectedGenre, setSelectedGenre] = useState<Genre>('all')
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const allShowsRef = useRef<HTMLDivElement | null>(null)
  const hasMountedPaginationRef = useRef(false)

  useEffect(() => {
    fetchConcerts()
  }, [])

  useEffect(() => {
    if (selectedGenre === 'all') {
      setFilteredConcerts(concerts)
    } else {
      setFilteredConcerts(concerts.filter((c) => c.genre === selectedGenre))
    }
    setCurrentPage(1)
  }, [selectedGenre, concerts])

  useEffect(() => {
    if (!hasMountedPaginationRef.current) {
      hasMountedPaginationRef.current = true
      return
    }

    allShowsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentPage])

  const fetchConcerts = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('concerts')
      .select('*')
      .order('date_str', { ascending: true })

    if (!error && data) {
      setConcerts(data as Concert[])
    }
    setLoading(false)
  }

  // 解析日期字串（處理範圍格式如 '2026/04/25–26'）
  const parseDate = (dateStr: string) => {
    const firstDate = dateStr.split('–')[0].split('-')[0].trim()
    return new Date(firstDate.replace(/\//g, '-'))
  }

  const now = new Date()
  const futureConcerts = concerts
    .filter((c) => parseDate(c.date_str) >= now)
    .sort((a, b) => parseDate(a.date_str).getTime() - parseDate(b.date_str).getTime())
  const hotFuture = futureConcerts.filter((c) => c.is_hot)
  const hotConcerts =
    hotFuture.length >= 5
      ? hotFuture
      : [...hotFuture, ...futureConcerts.filter((c) => !c.is_hot)].slice(0, 5)
  const totalPages = Math.ceil(filteredConcerts.length / concertsPerPage)
  const visiblePageItems = getVisiblePageItems(currentPage, totalPages)
  const paginatedConcerts = filteredConcerts.slice(
    (currentPage - 1) * concertsPerPage,
    currentPage * concertsPerPage
  )
  
  // 找到最近的未來演唱會
  const nextConcert = futureConcerts[0] ?? null

  return (
    <>
      <div className="pb-24">
        <HeroSection />

        {/* 搜尋功能移到首頁 */}
        <ConcertSearchSection compact />

        {/* 倒數計時 */}
        {nextConcert && (
          <div className="px-4 mb-8">
            <SectionLabel icon="⏰" text={t('距離最近場次', 'Next Show')} />
            <Countdown targetDate={nextConcert.date_str} />
            
            {/* 演唱會橫幅圖 */}
            <div 
              className="mt-4 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
              onClick={() => setSelectedConcert(nextConcert)}
              style={{
                height: '180px',
                position: 'relative',
                backgroundImage: nextConcert.image_url
                  ? `url(${nextConcert.image_url})`
                  : 'url(https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* 深色遮罩 */}
              <div className="absolute inset-0 bg-black/50" />
              
              {/* 漸層覆蓋 */}
              <div 
                className="absolute inset-0"
                style={{
                    background: nextConcert.grad_css ?? 'transparent',
                  opacity: 0.7,
                  mixBlendMode: 'multiply'
                }}
              />
              
              {/* 內容 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                <div className="text-5xl mb-2">{nextConcert.emoji}</div>
                <div className="text-2xl font-bold mb-1 drop-shadow-lg">{nextConcert.artist}</div>
                <div className="text-sm opacity-90 drop-shadow">
                  {nextConcert.tour_zh || nextConcert.tour_en}
                </div>
                <div className="text-sm opacity-75 mt-1 drop-shadow">
                  {nextConcert.date_str} · {nextConcert.city_zh}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 熱門演出 */}
        {hotConcerts.length > 0 && (
          <div className="mb-8">
            <div className="px-4">
              <SectionLabel icon={<IconSparkle className="w-4 h-4" />} text={t('熱門演出', 'Hot Shows')} />
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
              style={{ paddingLeft: '1rem', paddingRight: '1rem', WebkitOverflowScrolling: 'touch' }}
            >
              {hotConcerts.map((concert) => (
                <div key={concert.id} className="snap-start shrink-0">
                  <FeaturedCard
                    concert={concert}
                    onClick={() => setSelectedConcert(concert)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 曲風篩選 */}
        <div ref={allShowsRef} className="px-4 mb-6 scroll-mt-24">
          <SectionLabel icon={<IconMusic className="w-4 h-4" />} text={t('所有演出', 'All Shows')} />
          <GenreChips selected={selectedGenre} onSelect={setSelectedGenre} />
        </div>

        {/* 演出列表 */}
        <div className="px-4 space-y-3">
          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              {t('載入中...', 'Loading...')}
            </div>
          ) : filteredConcerts.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              {t('暫無演出', 'No concerts found')}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-1 text-sm" style={{ color: 'var(--muted)' }}>
                <span>
                  {t(
                    `第 ${currentPage} 頁，共 ${totalPages} 頁`,
                    `Page ${currentPage} of ${totalPages}`
                  )}
                </span>
                <span>
                  {t(
                    `共 ${filteredConcerts.length} 場演出`,
                    `${filteredConcerts.length} concerts`
                  )}
                </span>
              </div>

              {paginatedConcerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  onClick={() => setSelectedConcert(concert)}
                />
              ))}

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-4 pb-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-full px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--faint)',
                    }}
                  >
                    {t('上一頁', 'Previous')}
                  </button>

                  {visiblePageItems.map((item, index) => {
                    if (typeof item !== 'number') {
                      return (
                        <span
                          key={`${item}-${index}`}
                          className="px-1 text-sm"
                          style={{ color: 'var(--muted)' }}
                        >
                          ...
                        </span>
                      )
                    }

                    const isActive = item === currentPage

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className="h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition-transform hover:scale-105"
                        style={{
                          background: isActive ? 'var(--accent)' : 'var(--surface)',
                          color: isActive ? '#ffffff' : 'var(--text)',
                          border: isActive ? '1px solid var(--accent)' : '1px solid var(--faint)',
                        }}
                      >
                        {item}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-full px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      border: '1px solid var(--faint)',
                    }}
                  >
                    {t('下一頁', 'Next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConcertModal concert={selectedConcert} onClose={() => setSelectedConcert(null)} />
    </>
  )
}
