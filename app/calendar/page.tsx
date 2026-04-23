'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { ConcertCard } from '@/components/concerts/ConcertCard'
import { ConcertModal } from '@/components/concerts/ConcertModal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { IconCalendar } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'
import { deduplicateConcerts, getVisiblePageItems, parseFirstDate } from '@/lib/utils'

// 無日期資訊的分組 key（使用非數字前綴，排序會排在所有月份後面）
const TBA_MONTH_KEY = 'tba'

// date_str → "YYYY/MM"（統一補零，避免 "2026/4/25" 與 "2026/04/25" 分到不同組）
// 若 date_str 空值或無法解析，回傳 TBA_MONTH_KEY（歸入「日期待公布」組）
function toMonthKey(dateStr: string | null | undefined): string {
  if (!dateStr) return TBA_MONTH_KEY
  const d = parseFirstDate(dateStr)
  if (isNaN(d.getTime())) return TBA_MONTH_KEY
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}/${m}`
}

const CONCERTS_PER_PAGE = 10

export default function CalendarPage() {
  const { t } = useLang()
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const listRef = useRef<HTMLDivElement | null>(null)
  const hasMountedPaginationRef = useRef(false)

  useEffect(() => {
    fetchConcerts()
  }, [])

  // 切換月份或頁碼時捲回列表頂端
  useEffect(() => {
    if (!hasMountedPaginationRef.current) {
      hasMountedPaginationRef.current = true
      return
    }
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentPage])

  // 切換篩選時重置頁碼
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMonth, selectedCity])

  const fetchConcerts = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('concerts')
      .select('*')
      .order('date_str', { ascending: true })

    if (!error && data) {
      setConcerts(deduplicateConcerts(data as Concert[]))
    }
  }

  // 城市選項（從資料動態產生，固定排序）
  // city_zh 可能含 "/" 分隔多城市（如 "高雄/台北"），需拆分後再建集合
  const CITY_ORDER = useMemo(() => ['台北', '新北', '桃園', '台中', '高雄'], [])
  const availableCities = useMemo(() => {
    const citySet = new Set(
      concerts.flatMap((c) =>
        c.city_zh ? c.city_zh.split('/').map((s) => s.trim()).filter(Boolean) : []
      )
    )
    const ordered = CITY_ORDER.filter((c) => citySet.has(c))
    const rest = [...citySet].filter((c) => !CITY_ORDER.includes(c)).sort()
    return [...ordered, ...rest]
  }, [concerts, CITY_ORDER])

  // 套用城市篩選（支援 city_zh 含 "/" 的跨城市場次）
  const cityFilteredConcerts = useMemo(() => {
    if (selectedCity === 'all') return concerts
    return concerts.filter((c) =>
      c.city_zh
        ? c.city_zh.split('/').map((s) => s.trim()).includes(selectedCity)
        : false
    )
  }, [concerts, selectedCity])

  // 分組演出 (依月份，已套用城市篩選)
  const groupedConcerts = useMemo(() => {
    const groups: Record<string, Concert[]> = {}
    cityFilteredConcerts.forEach((concert) => {
      const month = toMonthKey(concert.date_str)
      if (!groups[month]) groups[month] = []
      groups[month].push(concert)
    })
    return groups
  }, [cityFilteredConcerts])

  const months = useMemo(() => Object.keys(groupedConcerts).sort(), [groupedConcerts])
  const displayedMonths = selectedMonth === 'all' ? months : months.filter((m) => m === selectedMonth)

  // 展開分頁用的扁平清單
  const allDisplayedConcerts = useMemo(
    () => displayedMonths.flatMap((month) => groupedConcerts[month] ?? []),
    [displayedMonths, groupedConcerts]
  )

  const totalPages = Math.ceil(allDisplayedConcerts.length / CONCERTS_PER_PAGE)
  const visiblePageItems = getVisiblePageItems(currentPage, totalPages)
  const paginatedConcerts = allDisplayedConcerts.slice(
    (currentPage - 1) * CONCERTS_PER_PAGE,
    currentPage * CONCERTS_PER_PAGE
  )

  // 重新依月份分組（僅含當頁資料）
  const paginatedGrouped = useMemo(() => {
    const groups: Record<string, Concert[]> = {}
    paginatedConcerts.forEach((concert) => {
      const month = toMonthKey(concert.date_str)
      if (!groups[month]) groups[month] = []
      groups[month].push(concert)
    })
    return groups
  }, [paginatedConcerts])

  const paginatedMonths = Object.keys(paginatedGrouped).sort()

  return (
    <>
      <div className="pb-24 min-h-screen">
        <div className="p-4">
          <SectionLabel icon={<IconCalendar className="w-4 h-4" />} text={t('演出日曆', 'Concert Calendar')} />

          {/* 城市篩選下拉 */}
          <div className="mb-4">
            <div className="relative inline-block">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2 rounded-full text-sm font-medium cursor-pointer transition-all"
                style={{
                  background: selectedCity !== 'all' ? 'var(--accent)' : 'var(--faint)',
                  color: selectedCity !== 'all' ? '#fff' : 'var(--text)',
                  border: 'none',
                  outline: 'none',
                }}
              >
                <option value="all">{t('全部城市', 'All Cities')}</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {/* 自訂下拉箭頭 */}
              <span
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: selectedCity !== 'all' ? '#fff' : 'var(--muted)' }}
              >
                ▾
              </span>
            </div>
          </div>

          {/* 月份篩選 */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
            <button
              onClick={() => setSelectedMonth('all')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedMonth === 'all' ? 'font-bold' : ''
              }`}
              style={{
                background: selectedMonth === 'all' ? 'var(--accent)' : 'var(--faint)',
                color: selectedMonth === 'all' ? '#fff' : 'var(--text)',
              }}
            >
              {t('全部', 'All')}
            </button>
            {months.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedMonth === month ? 'font-bold' : ''
                }`}
                style={{
                  background: selectedMonth === month ? 'var(--accent)' : 'var(--faint)',
                  color: selectedMonth === month ? '#fff' : 'var(--text)',
                }}
              >
                {month === TBA_MONTH_KEY ? t('日期待公布', 'TBA') : month}
              </button>
            ))}
          </div>

          {concerts.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              {t('暫無演出', 'No concerts found')}
            </div>
          ) : (
            <>
              {/* 頁數資訊 */}
              <div
                ref={listRef}
                className="flex items-center justify-between pb-3 text-sm scroll-mt-24"
                style={{ color: 'var(--muted)' }}
              >
                <span>
                  {t(
                    `第 ${currentPage} 頁，共 ${totalPages} 頁`,
                    `Page ${currentPage} of ${totalPages}`
                  )}
                </span>
                <span>
                  {t(
                    `共 ${allDisplayedConcerts.length} 場演出`,
                    `${allDisplayedConcerts.length} concerts`
                  )}
                </span>
              </div>

              {/* 演出列表 (分月顯示) */}
              <div className="space-y-8">
                {paginatedMonths.map((month) => (
                  <div key={month}>
                    <div className="text-sm font-bold mb-3 px-2" style={{ color: 'var(--accent)' }}>
                      {month === TBA_MONTH_KEY ? t('日期待公布', 'TBA') : month}
                    </div>
                    <div className="space-y-3">
                      {paginatedGrouped[month].map((concert) => (
                        <ConcertCard
                          key={concert.id}
                          concert={concert}
                          onClick={() => setSelectedConcert(concert)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 分頁控制 */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-6 pb-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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
