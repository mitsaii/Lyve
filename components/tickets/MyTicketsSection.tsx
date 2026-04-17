'use client'

import { useState, useEffect } from 'react'
import { UserTicket } from '@/types/ticket'
import { useLang } from '@/contexts/LangContext'
import { TicketCard } from './TicketCard'
import { AddTicketModal } from './AddTicketModal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { IconTicket } from '@/components/ui/Icons'

const STORAGE_KEY = 'lyve_user_tickets'

function loadTickets(): UserTicket[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserTicket[]) : []
  } catch {
    return []
  }
}

function saveTickets(tickets: UserTicket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
}

export function MyTicketsSection() {
  const { lang } = useLang()
  const [tickets, setTickets] = useState<UserTicket[]>([])
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const t = (zh: string, en: string) => lang === 'zh' ? zh : en

  useEffect(() => {
    setMounted(true)
    setTickets(loadTickets())
  }, [])

  const handleSave = (ticket: UserTicket) => {
    setTickets(prev => {
      const updated = [ticket, ...prev]
      saveTickets(updated)
      return updated
    })
  }

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id)
  }

  const confirmDelete = () => {
    if (!confirmDeleteId) return
    setTickets(prev => {
      const updated = prev.filter(t => t.id !== confirmDeleteId)
      saveTickets(updated)
      return updated
    })
    setConfirmDeleteId(null)
  }

  if (!mounted) return null

  // sort: upcoming first, then by date descending
  const sorted = [...tickets].sort((a, b) => {
    const da = new Date(a.dateStr).getTime()
    const db = new Date(b.dateStr).getTime()
    const now = Date.now()
    const aFuture = da >= now
    const bFuture = db >= now
    if (aFuture && !bFuture) return -1
    if (!aFuture && bFuture) return 1
    return aFuture ? da - db : db - da
  })

  const ended = sorted.filter(t => new Date(t.dateStr) < new Date(new Date().toDateString()))
  const upcoming = sorted.filter(t => new Date(t.dateStr) >= new Date(new Date().toDateString()))

  return (
    <>
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <SectionLabel
            icon={<IconTicket className="w-4 h-4" />}
            text={t('我的門票', 'My Tickets')}
          />
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <span className="text-base leading-none">+</span>
            {t('新增門票', 'Add Ticket')}
          </button>
        </div>

        {/* Empty State */}
        {tickets.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center border-dashed border-2 flex flex-col items-center gap-3"
            style={{ borderColor: 'var(--faint)' }}
          >
            <span className="text-4xl">🎫</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                {t('還沒有任何門票', 'No tickets yet')}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {t('把你去過的演唱會票根收藏起來吧！', 'Add your concert ticket stubs here!')}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold mt-1"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {t('新增第一張門票', 'Add your first ticket')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="space-y-2.5">
                {upcoming.map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* Ended section */}
            {ended.length > 0 && (
              <div className="space-y-2.5">
                {upcoming.length > 0 && (
                  <p className="text-xs font-semibold px-1 pt-1" style={{ color: 'var(--muted)' }}>
                    {t('已結束', 'Ended')} · {ended.length} {t('場', 'shows')}
                  </p>
                )}
                {ended.map(ticket => (
                  <div key={ticket.id} className="opacity-70">
                    <TicketCard
                      ticket={ticket}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Ticket Modal */}
      {showModal && (
        <AddTicketModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm */}
      {confirmDeleteId && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setConfirmDeleteId(null)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
            style={{ background: 'var(--surface)' }}
          >
            <p className="font-bold text-center mb-1" style={{ color: 'var(--text)' }}>
              {t('確定要刪除這張門票？', 'Delete this ticket?')}
            </p>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--muted)' }}>
              {t('刪除後無法復原', 'This action cannot be undone')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--faint)', color: 'var(--text)' }}
              >
                {t('取消', 'Cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {t('刪除', 'Delete')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
