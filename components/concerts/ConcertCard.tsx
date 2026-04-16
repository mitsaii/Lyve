'use client'

import { useState } from 'react'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useSaved } from '@/contexts/SavedContext'
import { StatusTag } from '../ui/StatusTag'
import { statusLabel, tagColor } from '@/lib/utils'
import { IconPin, IconCalendar, IconTag, IconHeart } from '../ui/Icons'
import { ConcertAvatar } from './ConcertAvatar'
import { AlertPromptSheet } from './AlertPromptSheet'

interface ConcertCardProps {
  concert: Concert
  onClick: () => void
}

export function ConcertCard({ concert, onClick }: ConcertCardProps) {
  const { lang, t } = useLang()
  const { isSaved, toggleSave } = useSaved()
  const saved = isSaved(concert.id)
  const [showAlertPrompt, setShowAlertPrompt] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaving) return  // 防止快速連點重複送出請求
    setIsSaving(true)
    try {
      const isAdded = await toggleSave(concert.id)
      // 新增收藏且演唱會尚未開賣時，詢問是否開啟搶票提醒
      if (isAdded && concert.status === 'pending') {
        setShowAlertPrompt(true)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
    <div
      onClick={onClick}
      className="p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] fade-up"
      style={{
        background: 'var(--card)',
        boxShadow: 'var(--shadow)',
        borderLeft: `4px solid ${tagColor(concert.status)}`,
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <ConcertAvatar genre={concert.genre} size="sm" />
          <h3 className="font-bold text-lg truncate min-w-0">{concert.artist}</h3>
        </div>
        <div className="flex-shrink-0 flex-none whitespace-nowrap ml-auto pl-1">
          <StatusTag status={concert.status} label={statusLabel(concert.status, lang)} />
        </div>
      </div>

      <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
        {lang === 'zh' ? concert.tour_zh : concert.tour_en}
      </p>

      <div className="flex items-center gap-4 text-sm mb-3" style={{ color: 'var(--muted)' }}>
        <span className="flex items-center gap-1">
          <IconPin className="w-3.5 h-3.5 flex-shrink-0" />
          {lang === 'zh' ? concert.city_zh : concert.city_en}
        </span>
        <span className="flex items-center gap-1">
          <IconCalendar className="w-3.5 h-3.5 flex-shrink-0" />
          {concert.date_str}
        </span>
      </div>

      <div 
        className="pt-3 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--faint)' }}
      >
        <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
          <IconTag className="w-3.5 h-3.5 flex-shrink-0" />
          {lang === 'zh' ? concert.price_zh : concert.price_en}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-sm transition-all hover:scale-110 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--faint)', color: saved ? 'var(--accent)' : 'var(--muted)' }}
          >
            <IconHeart filled={saved} className="w-4 h-4" />
          </button>
          <button
            className="px-4 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {t('詳情', 'Details')}
          </button>
        </div>
      </div>
    </div>

    {showAlertPrompt && (
      <AlertPromptSheet
        concert={concert}
        onClose={() => setShowAlertPrompt(false)}
      />
    )}
    </>
  )
}
