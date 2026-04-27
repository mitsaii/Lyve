'use client'

import { useEffect, useState } from 'react'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useSaved } from '@/contexts/SavedContext'
import { StatusTag } from '../ui/StatusTag'
import { statusLabel, genreLabel } from '@/lib/utils'
import { IconPin, IconCalendar, IconTag, IconVenue, IconTicket, IconHeart } from '../ui/Icons'
import { ConcertAvatar } from './ConcertAvatar'
import { isTicketingPlatform } from '@/lib/utils'
import { downloadStoryImage, openInstagramDirect } from '@/lib/shareInstagram'
import { AlertPromptSheet } from './AlertPromptSheet'

interface ConcertModalProps {
  concert: Concert | null
  onClose: () => void
}

export function ConcertModal({ concert, onClose }: ConcertModalProps) {
  const { lang, t } = useLang()
  const { isSaved, toggleSave } = useSaved()
  const [showAlertPrompt, setShowAlertPrompt] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showIgSheet, setShowIgSheet] = useState(false)
  const [igDownloaded, setIgDownloaded] = useState(false)

  useEffect(() => {
    if (!concert) return
    // 保存進場前的值，離場時還原（避免疊多層 modal 時把外層的 hidden 也清掉）
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [concert])

  if (!concert) return null

  const saved = isSaved(concert.id)

  // 搶票時間顯示
  const formatSaleTime = () => {
    if (concert.status === 'ended') return t('⚫ 演唱會已結束', '⚫ Event Ended')
    if (concert.sale_start_at) {
      const d = new Date(concert.sale_start_at)
      // 防禦：sale_start_at 格式錯誤時 d 為 Invalid Date
      if (isNaN(d.getTime())) return t('⏳ 待公布', '⏳ TBA')
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
        return `${dateStr} ${timeStr}`
      }
      // 已過開賣時間，顯示時間 + 狀態標示
      const statusSuffix = concert.status === 'sold_out'
        ? t('　🔴 已售完', '　🔴 Sold Out')
        : concert.status === 'selling'
          ? t('　🟢 已開賣', '　🟢 On Sale')
          : ''
      return `${dateStr} ${timeStr}${statusSuffix}`
    }
    // 無 sale_start_at 時才 fallback 到純狀態文字
    if (concert.status === 'selling') return t('🟢 已開賣', '🟢 On Sale Now')
    if (concert.status === 'sold_out') return t('🔴 已售完', '🔴 Sold Out')
    return t('⏳ 待公布', '⏳ TBA')
  }

  const ticketSaleTime = formatSaleTime()

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaving) return  // 防止快速連點重複送出請求
    setIsSaving(true)
    try {
      const isAdded = await toggleSave(concert.id)
      if (isAdded && concert.status === 'pending') {
        setShowAlertPrompt(true)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleBuyTicket = () => {
    window.open(concert.platform_url, '_blank', 'noopener,noreferrer')
  }

  const buildShareText = () => [
    `🎤 ${concert.artist}`,
    lang === 'zh' ? concert.tour_zh : concert.tour_en,
    `📍 ${lang === 'zh' ? concert.venue_zh : concert.venue_en} · ${lang === 'zh' ? concert.city_zh : concert.city_en}`,
    `📅 ${concert.date_str}`,
  ].join('\n')

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/concert/${concert.id}`
    : `/concert/${concert.id}`

  const handleShareLine = () => {
    const text = `${buildShareText()}\n\n${shareUrl}`
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const handleShareThreads = () => {
    const text = `${buildShareText()}\n\n${shareUrl}`
    window.open(`https://www.threads.com/intent/post?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const handleIgStory = async () => {
    setShowIgSheet(false)
    await openInstagramDirect(concert, lang, shareUrl, 'story')
  }

  const handleIgDownload = async () => {
    const ok = await downloadStoryImage(concert, lang)
    if (ok) {
      setIgDownloaded(true)
      setTimeout(() => setIgDownloaded(false), 2500)
    }
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
                icon: null,
                label: t('搶票時間', 'Ticket Sale Time'),
                value: ticketSaleTime,
              },
            ].map((row, i) => (
              <div
                key={i}
                className="p-4 rounded-xl flex items-center gap-3"
                style={{ background: 'var(--faint)' }}
              >
                {row.icon && (
                  <span className="flex-shrink-0" style={{ color: 'var(--accent)' }}>{row.icon}</span>
                )}
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

          {/* 主要按鈕 */}
          <div className="flex gap-3 mb-3">
            {isTicketingPlatform(concert.platform) && (
              <button
                onClick={handleBuyTicket}
                className="flex-1 py-4 rounded-xl font-bold text-white transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--accent)' }}
              >
                {t('前往購票', 'Buy Tickets')} →
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`${isTicketingPlatform(concert.platform) ? 'px-6' : 'flex-1'} py-4 rounded-xl font-bold transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ background: 'var(--faint)', color: saved ? 'var(--accent)' : 'var(--muted)' }}
            >
              <IconHeart filled={saved} className="w-5 h-5" />
            </button>
          </div>

          {/* 分享列 */}
          <div className="flex gap-2">
            <p className="text-xs flex items-center mr-1" style={{ color: 'var(--muted)' }}>
              {t('揪朋友', 'Share')}
            </p>
            {/* LINE */}
            <button
              onClick={handleShareLine}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: '#06C755', color: '#fff' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE
            </button>
            {/* Threads */}
            <button
              onClick={handleShareThreads}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'var(--faint)', color: 'var(--text)' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.75-.375-1.36-.75-1.82-.513-.62-1.275-.936-2.27-.943h-.03c-.735 0-1.932.206-2.653 1.472l-1.773-1.017C8.478 5.58 10.004 4.99 11.979 4.99h.044c3.013.022 4.818 1.842 5.198 5.198.168.03.334.064.497.104 1.538.386 2.694 1.23 3.337 2.44.952 1.79.963 4.493-.815 6.229-1.678 1.643-3.81 2.351-6.918 2.374l-.136-.335Z" />
              </svg>
              Threads
            </button>
            {/* Instagram */}
            <button
              onClick={() => setShowIgSheet(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                color: '#fff',
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
              IG
            </button>
          </div>
        </div>
      </div>

      {/* IG 分享選單 */}
      {showIgSheet && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowIgSheet(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-[70] slide-up"
          >
            <div
              className="max-w-[480px] mx-auto rounded-t-3xl p-6"
              style={{ background: 'var(--surface)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1 rounded-full" style={{ background: 'var(--muted)' }} />
              </div>
              <p className="text-sm font-semibold text-center mb-4" style={{ color: 'var(--muted)' }}>
                {t('分享到 Instagram', 'Share to Instagram')}
              </p>
              <div className="flex flex-col gap-3">
                {/* 限時動態 */}
                <button
                  onClick={handleIgStory}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    color: '#fff',
                  }}
                >
                  <span className="text-lg">📸</span>
                  <div className="text-left">
                    <div className="font-semibold">{t('開啟限時動態', 'Open Stories')}</div>
                    <div className="text-xs opacity-80">{t('直接跳到 IG 限時動態相機', 'Jump straight to IG Story camera')}</div>
                  </div>
                </button>
                {/* 儲存圖片 */}
                <button
                  onClick={handleIgDownload}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: 'var(--faint)', color: 'var(--text)' }}
                >
                  <span className="text-lg">{igDownloaded ? '✅' : '💾'}</span>
                  <div className="text-left">
                    <div className="font-semibold">
                      {igDownloaded ? t('已儲存！', 'Saved!') : t('儲存限動圖片', 'Save Story Image')}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>
                      {t('下載精美圖片，自己貼到 IG', 'Download the image to share yourself')}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showAlertPrompt && (
        <AlertPromptSheet
          concert={concert}
          onClose={() => setShowAlertPrompt(false)}
        />
      )}
    </>
  )
}
