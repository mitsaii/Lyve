'use client'

import Image from 'next/image'
import { UserTicket, TICKET_COLORS } from '@/types/ticket'
import { useLang } from '@/contexts/LangContext'
import { IconTicket } from '@/components/ui/Icons'

interface TicketCardProps {
  ticket: UserTicket
  onDelete?: (id: string) => void
  onClick?: () => void
}

function getDateParts(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const monthsEn = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const monthsZh = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  return {
    monthEn: monthsEn[d.getMonth()],
    monthZh: monthsZh[d.getMonth()],
    day: d.getDate(),
    year: d.getFullYear(),
    isPast: d < new Date(new Date().toDateString()),
  }
}

export function TicketCard({ ticket, onDelete, onClick }: TicketCardProps) {
  const { lang } = useLang()
  const theme = TICKET_COLORS[ticket.color]
  const { monthEn, day, isPast } = getDateParts(ticket.dateStr)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(ticket.id)
  }

  return (
    <div
      onClick={onClick}
      className="relative flex rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98] hover:scale-[1.01]"
      style={{
        background: theme.bg,
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.06)`,
        minHeight: '100px',
      }}
    >
      {/* ── 左半：封面圖 ── */}
      <div className="relative flex-shrink-0 w-[90px]" style={{ background: 'rgba(0,0,0,0.2)' }}>
        {ticket.imageUrl ? (
          <Image
            src={ticket.imageUrl}
            alt={ticket.concertName}
            fill
            className="object-cover"
            sizes="90px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <IconTicket className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* ── 虛線分隔 + 凹口 ── */}
      <div className="relative flex-shrink-0 w-px flex flex-col items-center justify-center"
           style={{ margin: '0 14px' }}>
        {/* 上凹 */}
        <div
          className="absolute -top-2 rounded-full"
          style={{ width: 16, height: 16, background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)', zIndex: 1 }}
        />
        {/* 虛線 */}
        <div
          className="h-full"
          style={{
            width: 1,
            background: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 4px, transparent 4px, transparent 8px)',
          }}
        />
        {/* 下凹 */}
        <div
          className="absolute -bottom-2 rounded-full"
          style={{ width: 16, height: 16, background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)', zIndex: 1 }}
        />
      </div>

      {/* ── 中段：演出資訊 ── */}
      <div className="flex-1 py-4 pr-2 min-w-0 flex flex-col justify-center gap-1">
        <p className="font-bold text-sm leading-tight truncate" style={{ color: '#fff' }}>
          {ticket.concertName}
        </p>
        <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {ticket.artist}
        </p>
        {ticket.venue && (
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
            📍 {ticket.venue}
          </p>
        )}

        {/* 狀態標籤 */}
        <div className="mt-1 flex items-center gap-2">
          {isPast ? (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
            >
              {lang === 'zh' ? '已結束' : 'Ended'}
            </span>
          ) : (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: theme.border + '33', color: theme.border }}
            >
              {lang === 'zh' ? '即將到來' : 'Upcoming'}
            </span>
          )}
        </div>
      </div>

      {/* ── 右側：大日期 ── */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center px-4 py-4"
        style={{ borderLeft: `1px solid rgba(255,255,255,0.06)`, minWidth: 64 }}
      >
        <span className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {monthEn}
        </span>
        <span className="text-3xl font-black leading-none" style={{ color: '#fff' }}>
          {day}
        </span>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="mt-2 text-[10px] rounded-md px-1.5 py-0.5 transition-opacity hover:opacity-100 opacity-40"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >
            {lang === 'zh' ? '刪除' : 'Del'}
          </button>
        )}
      </div>
    </div>
  )
}
