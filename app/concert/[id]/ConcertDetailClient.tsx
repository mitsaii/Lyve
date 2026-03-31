'use client'

import { useRouter } from 'next/navigation'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useSaved } from '@/contexts/SavedContext'
import { useAlert } from '@/contexts/AlertContext'
import { StatusTag } from '@/components/ui/StatusTag'
import { statusLabel, genreLabel } from '@/lib/utils'
import {
  IconPin, IconCalendar, IconTag, IconVenue,
  IconTicket, IconClock, IconHeart,
} from '@/components/ui/Icons'

interface Props {
  concert: Concert
}

export default function ConcertDetailClient({ concert }: Props) {
  const router = useRouter()
  const { lang, t } = useLang()
  const { isSaved, toggleSave } = useSaved()
  const { alertIds, toggleAlert } = useAlert()

  const saved = isSaved(concert.id)
  const alerted = alertIds.has(concert.id)

  const ticketSaleTime =
    concert.status === 'selling'
      ? t('已開賣', 'On Sale Now')
      : concert.status === 'pending'
        ? concert.sale_start_at
          ? new Date(concert.sale_start_at).toLocaleString('zh-TW', {
              timeZone: 'Asia/Taipei',
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })
          : t('待公布', 'TBA')
        : t('已截止', 'Closed')

  const handleShare = async () => {
    const shareData = {
      title: `${concert.artist} ${concert.tour_zh}`,
      text: `${concert.city_zh} · ${concert.venue_zh} · ${concert.date_str}`,
      url: window.location.href,
    }
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert(t('連結已複製！', 'Link copied!'))
    }
  }

  const infoRows = [
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
  ]

  return (
    <div className="px-4 py-2">
      {/* 返回按鈕 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-6 text-sm transition-opacity hover:opacity-70"
        style={{ color: 'var(--muted)' }}
      >
        ← {t('返回', 'Back')}
      </button>

      {/* 封面漸層 */}
      <div
        className="rounded-3xl p-8 mb-6 text-center relative overflow-hidden"
        style={{
          background: concert.grad_css ?? 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
          minHeight: 220,
        }}
      >
        {/* 背景圖 */}
        {concert.image_url && (
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{ backgroundImage: `url(${concert.image_url})` }}
          />
        )}
        <div className="relative z-10">
          <div className="text-6xl mb-4">{concert.emoji}</div>
          <h1 className="text-3xl font-bold text-white mb-2">{concert.artist}</h1>
          <p className="text-white/80 text-lg">
            {lang === 'zh' ? concert.tour_zh : concert.tour_en}
          </p>
        </div>
      </div>

      {/* 標籤列 */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span
          className="px-3 py-1 rounded-full text-sm"
          style={{ background: 'var(--faint)', color: 'var(--text)' }}
        >
          {genreLabel(concert.genre, lang)}
        </span>
        <span
          className="px-3 py-1 rounded-full text-sm flex items-center gap-1"
          style={{ background: 'var(--faint)', color: 'var(--text)' }}
        >
          <IconPin className="w-3 h-3" />
          {lang === 'zh' ? concert.city_zh : concert.city_en}
        </span>
        <StatusTag status={concert.status} label={statusLabel(concert.status, lang)} />
      </div>

      {/* Info Rows */}
      <div className="space-y-3 mb-6">
        {infoRows.map((row, i) => (
          <div
            key={i}
            className="p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'var(--surface)' }}
          >
            <span className="flex-shrink-0" style={{ color: 'var(--accent)' }}>
              {row.icon}
            </span>
            <div className="flex-1">
              <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
                {row.label}
              </div>
              <div className="font-medium" style={{ color: 'var(--text)' }}>
                {row.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 動作按鈕 */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => window.open(concert.platform_url, '_blank', 'noopener,noreferrer')}
          className="flex-1 py-4 rounded-xl font-bold text-white transition-transform hover:scale-[1.02]"
          style={{ background: 'var(--accent)' }}
        >
          {t('前往購票', 'Buy Tickets')} →
        </button>
        <button
          onClick={() => toggleSave(concert.id)}
          className="px-5 py-4 rounded-xl font-bold transition-all hover:scale-110 flex items-center justify-center"
          style={{ background: 'var(--surface)', color: saved ? 'var(--accent)' : 'var(--muted)' }}
          title={saved ? t('取消收藏', 'Unsave') : t('收藏', 'Save')}
        >
          <IconHeart filled={saved} className="w-5 h-5" />
        </button>
        <button
          onClick={handleShare}
          className="px-5 py-4 rounded-xl font-bold transition-all hover:scale-110 flex items-center justify-center text-lg"
          style={{ background: 'var(--surface)', color: 'var(--muted)' }}
          title={t('分享', 'Share')}
        >
          ↗
        </button>
      </div>

      {/* 提醒按鈕（待開賣才顯示） */}
      {concert.status === 'pending' && (
        <button
          onClick={() => toggleAlert(concert.id)}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: alerted ? 'var(--accent)' : 'var(--faint)',
            color: alerted ? '#fff' : 'var(--muted)',
          }}
        >
          {alerted
            ? t('🔔 已設定開賣提醒', '🔔 Reminder Set')
            : t('🔕 開賣前提醒我', '🔕 Notify Me')}
        </button>
      )}
    </div>
  )
}
