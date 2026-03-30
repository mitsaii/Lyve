'use client'

import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useSaved } from '@/contexts/SavedContext'
import { StatusTag } from '../ui/StatusTag'
import { statusLabel, tagColor } from '@/lib/utils'
import { IconPin, IconCalendar, IconTag, IconHeart } from '../ui/Icons'

interface ConcertCardProps {
  concert: Concert
  onClick: () => void
}

export function ConcertCard({ concert, onClick }: ConcertCardProps) {
  const { lang, t } = useLang()
  const { isSaved, toggleSave } = useSaved()
  const saved = isSaved(concert.id)

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await toggleSave(concert.id)
  }

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] fade-up"
      style={{
        background: 'var(--card)',
        boxShadow: 'var(--shadow)',
        borderLeft: `4px solid ${tagColor(concert.status)}`,
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{concert.emoji}</span>
          <h3 className="font-bold text-lg">{concert.artist}</h3>
        </div>
        <StatusTag status={concert.status} label={statusLabel(concert.status, lang)} />
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
            className="px-3 py-1.5 rounded-lg text-sm transition-all hover:scale-110 flex items-center justify-center"
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
  )
}
