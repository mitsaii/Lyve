'use client'

import { useEffect } from 'react'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useSaved } from '@/contexts/SavedContext'
import { StatusTag } from '../ui/StatusTag'
import { statusLabel, genreLabel } from '@/lib/utils'
import { IconPin, IconCalendar, IconTag, IconVenue, IconTicket, IconClock, IconHeart } from '../ui/Icons'
import { ConcertAvatar } from './ConcertAvatar'

interface ConcertModalProps {
  concert: Concert | null
  onClose: () => void
}

export function ConcertModal({ concert, onClose }: ConcertModalProps) {
  const { lang, t } = useLang()
  const { isSaved, toggleSave } = useSaved()

  useEffect(() => {
    if (concert) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [concert])

  if (!concert) return null

  const saved = isSaved(concert.id)

  // 搶票時間顯示
  const formatSaleTime = () => {
    if (concert.status === 'selling') return t('🟢 已開賣', '🟢 On Sale Now')
    if (concert.status === 'sold_out') return t('🔴 已截止', '🔴 Closed')
    if (concert.sale_start_at) {
      const d = new Date(concert.sale_start_at)
      const now = new Date()
      const diff = d.getTime() - now.getTime()
      const dateStr = d.toLocaleDateString('zh-TW', {
        timeZone: 'Asia/Taipei',
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
      const timeStr = d.toLocaleTimeString('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour: '2-digit', minute: '2-digit',
      })
      if (diff > 0) {
        const days = Math.floor(diff / 86400000)
        const hours = Math.floor((diff % 86400000) / 3600000)
        const countdown = days > 0
          ? t(`⏳ 還有 ${days} 天 ${hours} 小時`, `⏳ In ${days}d ${hours}h`)
          : t(`⏳ 還有 ${hours} 小時`, `⏳ In ${hours}h`)
        return `${dateStr} ${timeStr}　${countdown}`
      }
      return `${dateStr} ${timeStr}`
    }
    return t('⏳ 待公布', '⏳ TBA')
  }

  const ticketSaleTime = formatSaleTime()

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await toggleSave(concert.id)
  }

  const handleBuyTicket = () => {
    window.open(concert.platform_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 slide-up">
        <div
          className="max-w-[480px] mx-auto rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
          style={{ background: 'var(--surface)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 把手 */}
          <div className="flex justify-center mb-4">
            <div
              className="w-12 h-1 rounded-full"
              style={{ background: 'var(--muted)' }}
            />
          </div>

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'var(--faint)' }}
          >
            ✕
          </button>

          {/* 標題 */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <ConcertAvatar genre={concert.genre} size="lg" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{concert.artist}</h2>
            <p className="text-lg" style={{ color: 'var(--muted)' }}>
              {lang === 'zh' ? concert.tour_zh : concert.tour_en}
            </p>
          </div>

          {/* Pills */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            <span
              className="px-3 py-1 rounded-full text-sm"
              style={{ background: 'var(--faint)' }}
            >
              {genreLabel(concert.genre, lang)}
            </span>
            <span
              className="px-3 py-1 rounded-full text-sm flex items-center gap-1"
              style={{ background: 'var(--faint)' }}
            >
              <IconPin className="w-3 h-3" />
              {lang === 'zh' ? concert.city_zh : concert.city_en}
            </span>
            <StatusTag status={concert.status} label={statusLabel(concert.status, lang)} />
          </div>

          {/* Info Rows */}
          <div className="space-y-3 mb-6">
            {[
              {
                icon: <IconVenue className="w-5 h-5" />,
                label: t('場地', 'Venue'),
                value: lang === 'zh' ? concert.venue_zh : concert.venue_en,
              },
              {
                icon: <IconCalendar className="w-5 h-5" />,
                label: t('日期', 'Date'),
                value: concert.date_str,
              },
              {
                icon: <IconTag className="w-5 h-5" />,
                label: t('票價', 'Price'),
                value: lang === 'zh' ? concert.price_zh : concert.price_en,
              },
              {
                icon: <IconTicket className="w-5 h-5" />,
                label: t('售票平台', 'Platform'),
                value: concert.platform,
              },
              {
                icon: <IconClock className="w-5 h-5" />,
                label: t('搶票時間', 'Ticket Sale Time'),
                value: ticketSaleTime,
              },
            ].map((row, i) => (
              <div
                key={i}
                className="p-4 rounded-xl flex items-center gap-3"
                style={{ background: 'var(--faint)' }}
              >
                <span className="flex-shrink-0" style={{ color: 'var(--accent)' }}>{row.icon}</span>
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
                    {row.label}
                  </div>
                  <div
                    className="font-medium"
                    style={{ color: 'var(--text)' }}
                  >
                    {row.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3">
            <button
              onClick={handleBuyTicket}
              className="flex-1 py-4 rounded-xl font-bold text-white transition-transform hover:scale-[1.02]"
              style={{ background: 'var(--accent)' }}
            >
              {t('前往購票', 'Buy Tickets')} →
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-4 rounded-xl font-bold transition-all hover:scale-110 flex items-center justify-center"
              style={{ background: 'var(--faint)', color: saved ? 'var(--accent)' : 'var(--muted)' }}
            >
              <IconHeart filled={saved} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
