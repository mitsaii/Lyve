'use client'

import { useState, useEffect } from 'react'
import { UserTicket } from '@/types/ticket'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { TicketCard } from './TicketCard'
import { AddTicketModal } from './AddTicketModal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { IconTicket } from '@/components/ui/Icons'

const STORAGE_KEY = 'lyve_user_tickets'

// DB row 結構 <-> 前端 UserTicket 轉換
interface DbTicketRow {
  id: string
  concert_name: string
  artist: string
  venue: string | null
  date_str: string
  image_url: string | null
  color: string
  notes: string | null
  created_at: string
}

function rowToTicket(row: DbTicketRow): UserTicket {
  return {
    id: row.id,
    concertName: row.concert_name,
    artist: row.artist,
    venue: row.venue ?? undefined,
    dateStr: row.date_str,
    imageUrl: row.image_url ?? undefined,
    color: (row.color as UserTicket['color']) || 'navy',
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

// localStorage fallback（未登入或 DB 尚未同步時顯示）
function loadLocalTickets(): UserTicket[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserTicket[]) : []
  } catch {
    return []
  }
}

function saveLocalTickets(tickets: UserTicket[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
  } catch {
    /* ignore quota errors */
  }
}

export function MyTicketsSection() {
  const { lang } = useLang()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<UserTicket[]>([])
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [synced, setSynced] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const t = (zh: string, en: string) => lang === 'zh' ? zh : en

  // 初始 mount：先用 localStorage 顯示（避免閃白）
  useEffect(() => {
    setMounted(true)
    setTickets(loadLocalTickets())
  }, [])

  // 登入後從 Supabase 同步
  useEffect(() => {
    if (!user) {
      // 未登入：使用 localStorage
      setTickets(loadLocalTickets())
      setSynced(true)
      return
    }

    setSynced(false)
    const supabase = createClient()
    ;(async () => {
      const { data, error } = await supabase
        .from('user_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('date_str', { ascending: true })

      if (error) {
        console.error('[MyTickets] fetch failed:', error.message)
        setSynced(true)
        return
      }

      const dbList = (data as DbTicketRow[] | null)?.map(rowToTicket) ?? []

      // 一次性遷移：如果 DB 空但 localStorage 有舊資料，幫忙上傳
      if (dbList.length === 0) {
        const legacyLocal = loadLocalTickets()
        if (legacyLocal.length > 0) {
          const { data: migrated, error: migrateErr } = await supabase
            .from('user_tickets')
            .insert(
              legacyLocal.map(tk => ({
                user_id: user.id,
                concert_name: tk.concertName,
                artist: tk.artist,
                venue: tk.venue ?? null,
                date_str: tk.dateStr,
                image_url: tk.imageUrl ?? null,
                color: tk.color,
                notes: tk.notes ?? null,
              }))
            )
            .select()

          if (!migrateErr && migrated) {
            const migratedList = (migrated as DbTicketRow[]).map(rowToTicket)
            setTickets(migratedList)
            saveLocalTickets(migratedList)
            setSynced(true)
            return
          }
          console.error('[MyTickets] migrate failed:', migrateErr?.message)
        }
      }

      setTickets(dbList)
      saveLocalTickets(dbList)
      setSynced(true)
    })()
  }, [user])

  const handleSave = async (ticket: UserTicket) => {
    if (user) {
      // 登入狀態：寫入 Supabase
      const supabase = createClient()
      const { data, error } = await supabase
        .from('user_tickets')
        .insert({
          user_id: user.id,
          concert_name: ticket.concertName,
          artist: ticket.artist,
          venue: ticket.venue ?? null,
          date_str: ticket.dateStr,
          image_url: ticket.imageUrl ?? null,
          color: ticket.color,
          notes: ticket.notes ?? null,
        })
        .select()
        .single()

      if (error || !data) {
        console.error('[MyTickets] insert failed:', error?.message)
        alert(t('儲存失敗，請稍後再試', 'Save failed, please try again'))
        return
      }

      const saved = rowToTicket(data as DbTicketRow)
      setTickets(prev => {
        const updated = [saved, ...prev]
        saveLocalTickets(updated)
        return updated
      })
    } else {
      // 未登入：僅寫入 localStorage
      setTickets(prev => {
        const updated = [ticket, ...prev]
        saveLocalTickets(updated)
        return updated
      })
    }
  }

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    const idToDelete = confirmDeleteId
    setConfirmDeleteId(null)

    // 樂觀更新
    const prevTickets = tickets
    const updated = prevTickets.filter(tk => tk.id !== idToDelete)
    setTickets(updated)
    saveLocalTickets(updated)

    if (user) {
      const supabase = createClient()
      const { error } = await supabase
        .from('user_tickets')
        .delete()
        .eq('id', idToDelete)
        .eq('user_id', user.id)

      if (error) {
        console.error('[MyTickets] delete failed:', error.message)
        // 回滾
        setTickets(prevTickets)
        saveLocalTickets(prevTickets)
        alert(t('刪除失敗，請稍後再試', 'Delete failed, please try again'))
      }
    }
  }

  if (!mounted) return null

  // 登入但尚未同步時顯示骨架
  const showSkeleton = user && !synced && tickets.length === 0

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

  const ended = sorted.filter(tk => new Date(tk.dateStr) < new Date(new Date().toDateString()))
  const upcoming = sorted.filter(tk => new Date(tk.dateStr) >= new Date(new Date().toDateString()))

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

        {/* Loading skeleton (登入但同步中) */}
        {showSkeleton ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div
                key={i}
                className="h-32 rounded-2xl animate-pulse"
                style={{ background: 'var(--surface)' }}
              />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          /* Empty State */
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
