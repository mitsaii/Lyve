'use client'

import { useState, useEffect } from 'react'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useAlert } from '@/contexts/AlertContext'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { ConcertModal } from '@/components/concerts/ConcertModal'
import { IconBell, IconCalendar } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 10

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'var(--faint)', color: 'var(--foreground)' }}
      >
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110 active:scale-95"
          style={{
            background: p === page ? 'var(--accent)' : 'var(--faint)',
            color: p === page ? '#fff' : 'var(--foreground)',
          }}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'var(--faint)', color: 'var(--foreground)' }}
      >
        ›
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
  const [alertedPage, setAlertedPage] = useState(1)
  const [pendingPage, setPendingPage] = useState(1)

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
      setConcerts(data as Concert[])
    }
    setLoading(false)
  }

  const alertedConcerts = concerts.filter((c) => hasAlert(c.id))
  const pendingConcerts = concerts.filter((c) => !hasAlert(c.id))

  const alertedPageConcerts = alertedConcerts.slice((alertedPage - 1) * PAGE_SIZE, alertedPage * PAGE_SIZE)
  const pendingPageConcerts = pendingConcerts.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE)

  return (
    <>
      <div className="pb-24 min-h-screen">
        <div className="p-4">
          <SectionLabel icon={<IconBell className="w-4 h-4" />} text={t('搶票提醒', 'Ticket Alerts')} />
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            {t('設定提醒，將在開搶前 10 分鐘跳出通知', 'Get notified 10 minutes before ticket sales start')}
          </p>

          {/* 已設定提醒 */}
          {alertedConcerts.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                {t('已設定提醒', 'Alerts Set')} ({alertedConcerts.length})
              </p>
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
                onChange={(p) => { setAlertedPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              />
            </div>
          )}

          {/* 即將開賣 */}
          <div>
            <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              {t('即將開賣', 'Coming Soon')}
            </p>
            {loading ? (
              <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
                {t('載入中...', 'Loading...')}
              </div>
            ) : pendingConcerts.length === 0 && alertedConcerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4" style={{ color: 'var(--muted)' }}>
                <IconBell className="w-14 h-14" />
              </div>
                <p style={{ color: 'var(--muted)' }}>{t('目前沒有即將開賣的演出', 'No upcoming sales')}</p>
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
                  onChange={(p) => { setPendingPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
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
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const dateStr = d.toLocaleDateString('zh-TW', {
      timeZone: 'Asia/Taipei',
      month: '2-digit', day: '2-digit',
    })
    const timeStr = d.toLocaleTimeString('zh-TW', {
      timeZone: 'Asia/Taipei',
      hour: '2-digit', minute: '2-digit',
    })
    if (diff > 0) {
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const countdown = days > 0
        ? (lang === 'zh' ? `還有 ${days} 天` : `In ${days}d`)
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
          <p className="font-bold truncate" style={{ color: 'var(--foreground)' }}>
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
        className="mt-3 px-3 py-2 rounded-xl text-xs font-medium"
        style={{
          background: alerted ? 'var(--accent)22' : 'var(--faint)',
          color: alerted ? 'var(--accent)' : 'var(--muted)',
          borderLeft: alerted ? '3px solid var(--accent)' : '3px solid var(--faint)',
        }}
      >
        {saleTimeDisplay}
      </div>
    </div>
  )
}
