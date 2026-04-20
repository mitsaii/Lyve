'use client'

import { useState, useEffect, useRef } from 'react'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useAlert } from '@/contexts/AlertContext'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { ConcertModal } from '@/components/concerts/ConcertModal'
import { IconBell, IconCalendar } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'
import { deduplicateConcerts, getVisiblePageItems } from '@/lib/utils'

const PAGE_SIZE = 10

function Pagination({
  page,
  total,
  sectionRef,
  onChange,
}: {
  page: number
  total: number
  sectionRef?: React.RefObject<HTMLDivElement | null>
  onChange: (p: number) => void
}) {
  const { t } = useLang()
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  const visiblePageItems = getVisiblePageItems(page, totalPages)

  const handleChange = (p: number) => {
    onChange(p)
    sectionRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-4 pb-2">
      <button
        type="button"
        onClick={() => handleChange(Math.max(page - 1, 1))}
        disabled={page === 1}
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
        const isActive = item === page
        return (
          <button
            key={item}
            type="button"
            onClick={() => handleChange(item)}
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
        onClick={() => handleChange(Math.min(page + 1, totalPages))}
        disabled={page === totalPages}
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
  )
}

export default function AlertsPage() {
  const { t } = useLang()
  const { toggleAlert, hasAlert } = useAlert()
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [alertedPage, setAlertedPage] = useState(1)
  const [pendingPage, setPendingPage] = useState(1)
  const alertedRef = useRef<HTMLDivElement | null>(null)
  const pendingRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchConcerts()
  }, [])

  const fetchConcerts = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('concerts')
      .select('*')
      .eq('status', 'pending')
      .order('date_str', { ascending: true })

    if (!error && data) {
      setConcerts(deduplicateConcerts(data as Concert[]))
    }
    setLoading(false)
  }

  const filteredConcerts = query.trim()
    ? concerts.filter((c) => {
        const q = query.toLowerCase()
        return (
          c.artist.toLowerCase().includes(q) ||
          c.tour_zh.toLowerCase().includes(q) ||
          c.tour_en.toLowerCase().includes(q) ||
          c.city_zh.toLowerCase().includes(q) ||
          c.city_en.toLowerCase().includes(q) ||
          c.venue_zh.toLowerCase().includes(q) ||
          c.venue_en.toLowerCase().includes(q)
        )
      })
    : concerts

  const alertedConcerts = filteredConcerts.filter((c) => hasAlert(c.id))
  const pendingConcerts = filteredConcerts.filter((c) => !hasAlert(c.id))

  const alertedPageConcerts = alertedConcerts.slice((alertedPage - 1) * PAGE_SIZE, alertedPage * PAGE_SIZE)
  const pendingPageConcerts = pendingConcerts.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE)

  return (
    <>
      <div className="pb-24 min-h-screen">
        <div className="p-4">
          <SectionLabel icon={<IconBell className="w-4 h-4" />} text={t('搶票提醒', 'Ticket Alerts')} />
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            {t('設定提醒，將在開搶前 10 分鐘跳出通知', 'Get notified 10 minutes before ticket sales start')}
          </p>

          {/* 搜尋列 */}
          <div className="relative mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setAlertedPage(1); setPendingPage(1) }}
              placeholder={t('搜尋歌手、場地、城市...', 'Search artist, venue, city...')}
              className="w-full p-4 pl-12 rounded-2xl text-base outline-none transition-all focus:scale-[1.02]"
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '2px solid var(--faint)',
              }}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
              <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="9" r="6" />
                <path d="M13.5 13.5L17.5 17.5" />
              </svg>
            </span>
            {query && (
              <button
                onClick={() => { setQuery(''); setAlertedPage(1); setPendingPage(1) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full"
                style={{ background: 'var(--faint)', color: 'var(--muted)' }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* 已設定提醒 */}
          {alertedConcerts.length > 0 && (
            <div className="mb-6">
              <div ref={alertedRef} className="scroll-mt-24">
                <div className="flex items-center justify-between pb-3 text-sm" style={{ color: 'var(--muted)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {t('已設定提醒', 'Alerts Set')} ({alertedConcerts.length})
                  </p>
                  <span>
                    {t(
                      `第 ${alertedPage} 頁，共 ${Math.ceil(alertedConcerts.length / PAGE_SIZE)} 頁`,
                      `Page ${alertedPage} of ${Math.ceil(alertedConcerts.length / PAGE_SIZE)}`
                    )}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {alertedPageConcerts.map((concert) => (
                  <AlertCard
                    key={concert.id}
                    concert={concert}
                    alerted
                    onToggle={() => toggleAlert(concert.id)}
                    onClick={() => setSelectedConcert(concert)}
                  />
                ))}
              </div>
              <Pagination
                page={alertedPage}
                total={alertedConcerts.length}
                sectionRef={alertedRef}
                onChange={setAlertedPage}
              />
            </div>
          )}

          {/* 即將開賣 */}
          <div>
            <div ref={pendingRef} className="scroll-mt-24">
              <div className="flex items-center justify-between pb-3 text-sm" style={{ color: 'var(--muted)' }}>
                <p className="text-xs font-bold uppercase tracking-wider">
                  {t('即將開賣', 'Coming Soon')}
                </p>
                {pendingConcerts.length > 0 && (
                  <span>
                    {t(
                      `共 ${pendingConcerts.length} 場`,
                      `${pendingConcerts.length} concerts`
                    )}
                  </span>
                )}
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
                {t('載入中...', 'Loading...')}
              </div>
            ) : pendingConcerts.length === 0 && alertedConcerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4" style={{ color: 'var(--muted)' }}>
                  <IconBell className="w-14 h-14" />
                </div>
                <p style={{ color: 'var(--muted)' }}>
                  {query.trim()
                    ? t(`找不到「${query}」相關的演出`, `No results for "${query}"`)
                    : t('目前沒有即將開賣的演出', 'No upcoming sales')}
                </p>
              </div>
            ) : pendingConcerts.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
                <p className="text-sm">{t('所有演出都已設定提醒！', 'All concerts have alerts set!')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {pendingPageConcerts.map((concert) => (
                    <AlertCard
                      key={concert.id}
                      concert={concert}
                      alerted={false}
                      onToggle={() => toggleAlert(concert.id)}
                      onClick={() => setSelectedConcert(concert)}
                    />
                  ))}
                </div>
                <Pagination
                  page={pendingPage}
                  total={pendingConcerts.length}
                  sectionRef={pendingRef}
                  onChange={setPendingPage}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <ConcertModal concert={selectedConcert} onClose={() => setSelectedConcert(null)} />
    </>
  )
}

function AlertCard({
  concert,
  alerted,
  onToggle,
  onClick,
}: {
  concert: Concert
  alerted: boolean
  onToggle: () => void
  onClick: () => void
}) {
  const { lang } = useLang()

  // 搶票時間格式化
  const saleTimeDisplay = (() => {
    if (!concert.sale_start_at) return lang === 'zh' ? '⏳ 時間待公布' : '⏳ TBA'
    const d = new Date(concert.sale_start_at)
    if (isNaN(d.getTime())) return lang === 'zh' ? '⏳ 時間待公布' : '⏳ TBA'
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const dateStr = d.toLocaleDateString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
    const timeStr = d.toLocaleTimeString('zh-TW', {
      timeZone: 'Asia/Taipei',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    })
    if (diff > 0) {
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const countdown = days > 0
        ? (lang === 'zh' ? `還有 ${days} 天 ${hours} 小時` : `In ${days}d ${hours}h`)
        : hours > 0
          ? (lang === 'zh' ? `還有 ${hours} 小時` : `In ${hours}h`)
          : (lang === 'zh' ? `還有 ${mins} 分` : `In ${mins}m`)
      return `🎟 ${dateStr} ${timeStr}  ·  ${countdown}`
    }
    return `🎟 ${dateStr} ${timeStr}`
  })()

  return (
    <div
      className="p-4 rounded-2xl"
      style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center gap-3">
        {/* 圖片或漸層 */}
        <div
          className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden"
          style={{
            background: concert.grad_css ?? 'var(--faint)',
            backgroundImage: concert.image_url ? `url(${concert.image_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!concert.image_url && (
            <div className="w-full h-full flex items-center justify-center text-xl">
              {concert.emoji}
            </div>
          )}
        </div>

        {/* 資訊 */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <p className="font-bold truncate" style={{ color: 'var(--text)' }}>
            {concert.artist}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
            {lang === 'zh' ? concert.tour_zh : concert.tour_en}
          </p>
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
            <IconCalendar className="w-3 h-3 flex-shrink-0" />
            {concert.date_str} · {lang === 'zh' ? concert.city_zh : concert.city_en}
          </p>
        </div>

        {/* 提醒按鈕 */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
          style={{
            background: alerted ? 'var(--accent)' : 'var(--faint)',
          }}
        >
          <span style={{ color: alerted ? '#fff' : 'var(--muted)' }}>
            <IconBell filled={alerted} slash={!alerted} className="w-5 h-5" />
          </span>
        </button>
      </div>

      {/* 搶票時間橫幅 */}
      <div
        className="mt-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2"
        style={{
          background: alerted ? 'var(--accent)22' : 'var(--faint)',
          color: alerted ? 'var(--accent)' : 'var(--muted)',
          borderLeft: alerted ? '3px solid var(--accent)' : '3px solid transparent',
        }}
      >
        <span className="font-semibold opacity-70 flex-shrink-0">
          {lang === 'zh' ? '搶票時間' : 'Sale Time'}
        </span>
        <span className="text-right">{saleTimeDisplay}</span>
      </div>
    </div>
  )
}
