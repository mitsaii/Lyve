'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { ConcertCard } from '@/components/concerts/ConcertCard'
import { ConcertModal } from '@/components/concerts/ConcertModal'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialQuery: string
}

export default function SearchPageClient({ initialQuery }: Props) {
  const router = useRouter()
  const { t } = useLang()

  const [query, setQuery] = useState(initialQuery)
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [filteredConcerts, setFilteredConcerts] = useState<Concert[]>([])
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)

  // 同步 URL 參數（debounced）
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      const newUrl = query.trim() ? `/search?${params.toString()}` : '/search'
      router.replace(newUrl, { scroll: false })
    }, 400)
    return () => clearTimeout(timer)
  }, [query, router])

  useEffect(() => {
    const fetchConcerts = async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('concerts').select('*')
      if (!error && data) setConcerts(data as Concert[])
    }
    fetchConcerts()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setFilteredConcerts([])
      return
    }
    const q = query.toLowerCase()
    setFilteredConcerts(
      concerts.filter(
        c =>
          c.artist.toLowerCase().includes(q) ||
          c.tour_zh.toLowerCase().includes(q) ||
          c.tour_en.toLowerCase().includes(q) ||
          c.city_zh.toLowerCase().includes(q) ||
          c.city_en.toLowerCase().includes(q) ||
          c.venue_zh.toLowerCase().includes(q) ||
          c.venue_en.toLowerCase().includes(q)
      )
    )
  }, [query, concerts])

  return (
    <>
      <section className="pb-24 min-h-screen">
        <div
          className="p-4 sticky top-0 z-10"
          style={{ background: 'var(--bg)' }}
        >
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('搜尋歌手、場地、城市...', 'Search artist, venue, city...')}
              autoFocus
              className="w-full p-4 pl-12 rounded-2xl text-base outline-none transition-all focus:scale-[1.02]"
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '2px solid var(--faint)',
              }}
            />
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--muted)' }}
            >
              <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="9" r="6" />
                <path d="M13.5 13.5L17.5 17.5" />
              </svg>
            </span>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full"
                style={{ background: 'var(--faint)' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="px-4 space-y-3">
          {!query.trim() ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="text-4xl mb-3">🔍</p>
              <p>{t('輸入關鍵字搜尋演唱會', 'Type to search concerts')}</p>
            </div>
          ) : filteredConcerts.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
              <p className="text-4xl mb-3">😢</p>
              <p>{t('找不到相關演出', 'No concerts found')}</p>
            </div>
          ) : (
            <>
              <p className="py-2 text-sm" style={{ color: 'var(--muted)' }}>
                {t(`找到 ${filteredConcerts.length} 場演出`, `Found ${filteredConcerts.length} concerts`)}
              </p>
              {filteredConcerts.map(concert => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  onClick={() => setSelectedConcert(concert)}
                />
              ))}
            </>
          )}
        </div>
      </section>

      <ConcertModal concert={selectedConcert} onClose={() => setSelectedConcert(null)} />
    </>
  )
}
