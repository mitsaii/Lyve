'use client'

import { useState } from 'react'
import Image from 'next/image'
import { UserTicket, TICKET_COLORS } from '@/types/ticket'
import { useLang } from '@/contexts/LangContext'
import { IconTicket } from '@/components/ui/Icons'

interface TicketCardProps {
  ticket: UserTicket
  onDelete?: (id: string) => void
  onClick?: () => void
}

function getDateParts(dateStr: string, lang: 'zh' | 'en') {
  const d = new Date(dateStr + 'T00:00:00')
  const monthsEn = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const weekdaysEn = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const weekdaysZh = ['日','一','二','三','四','五','六']
  return {
    month: monthsEn[d.getMonth()],
    day: d.getDate(),
    weekday: lang === 'zh' ? `週${weekdaysZh[d.getDay()]}` : weekdaysEn[d.getDay()],
  }
}

export function TicketCard({ ticket, onDelete, onClick }: TicketCardProps) {
  const { lang } = useLang()
  const theme = TICKET_COLORS[ticket.color]
  const { month, day, weekday } = getDateParts(ticket.dateStr, lang)
  const [expanded, setExpanded] = useState(false)

  const handleClick = () => {
    setExpanded(v => !v)
    onClick?.()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(ticket.id)
  }

  return (
    <div
      onClick={handleClick}
      className="relative flex rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out"
      style={{
        background: theme.bg,
        boxShadow: expanded
          ? `0 10px 32px rgba(0,0,0,0.5), 0 0 0 1.5px ${theme.border}66, inset 0 0 0 1px rgba(255,255,255,0.08)`
          : `0 4px 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06)`,
        minHeight: expanded ? '155px' : '140px',
        transform: expanded ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* ── 左半：封面圖 ── */}
      <div
        className="relative flex-shrink-0"
        style={{ width: '40%', background: 'rgba(0,0,0,0.2)' }}
      >
        {ticket.imageUrl ? (
          <Image
            src={ticket.imageUrl}
            alt={ticket.concertName}
            fill
            className="object-cover"
            sizes="(max-width: 480px) 40vw, 192px"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <IconTicket className="w-10 h-10" />
          </div>
        )}
      </div>

      {/* ── 虛線分隔 + 上下凹口 ── */}
      <div
        className="relative flex-shrink-0 flex flex-col items-center justify-center"
        style={{ width: 1, margin: '0 10px' }}
      >
        <div
          className="absolute rounded-full"
          style={{
            top: -10,
            width: 20,
            height: 20,
            background: 'var(--bg)',
            zIndex: 2,
          }}
        />
        <div
          className="h-full"
          style={{
            width: 1.5,
            background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 5px, transparent 5px, transparent 10px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: -10,
            width: 20,
            height: 20,
            background: 'var(--bg)',
            zIndex: 2,
          }}
        />
      </div>

      {/* ── 右半：資訊 + 日期 ── */}
      <div className="flex-1 flex min-w-0">
        {/* 中段：演出資訊 */}
        <div className="flex-1 py-4 pr-1 min-w-0 flex flex-col">
          <div className="flex-1 min-w-0">
            <p
              className="font-bold text-base leading-tight"
              style={{
                color: '#fff',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {ticket.concertName}
            </p>

            {/* 藝人 pill */}
            <span
              className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                background: 'rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              {ticket.artist}
            </span>

            {/* 場地 */}
            {ticket.venue && (
              <p
                className="text-xs mt-1.5 truncate"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <span className="mr-0.5">📍</span>
                {ticket.venue}
              </p>
            )}

            {/* 備註（展開時顯示） */}
            {expanded && ticket.notes && (
              <p
                className="text-[11px] mt-2 leading-snug"
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {ticket.notes}
              </p>
            )}
          </div>

        </div>

        {/* 右側：大日期 */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-between py-4 pr-3 pl-2"
          style={{ minWidth: 66 }}
        >
          <div className="flex flex-col items-center">
            <span
              className="text-[10px] font-bold tracking-widest"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {month}
            </span>
            <span
              className="text-[36px] font-black leading-[1]"
              style={{ color: '#fff', letterSpacing: '-0.02em' }}
            >
              {day}
            </span>
            <span
              className="text-[10px] font-bold tracking-widest mt-0.5"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {weekday}
            </span>
            {ticket.timeStr && (
              <span
                className="text-[11px] font-medium mt-1"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                {ticket.timeStr}
              </span>
            )}
          </div>

          {onDelete && (
            <button
              onClick={handleDelete}
              className="text-[11px] font-medium transition-opacity hover:opacity-100 opacity-60"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {lang === 'zh' ? '刪除' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
