'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Concert, ConcertId } from '@/types/concert'

const REMINDER_OFFSET_MS = 10 * 60 * 1000
const REMINDED_STORAGE_KEY = 'alert-reminded-ids'

interface AlertContextType {
  alertIds: Set<ConcertId>
  toggleAlert: (concertId: ConcertId) => void
  hasAlert: (concertId: ConcertId) => boolean
}

const AlertContext = createContext<AlertContextType>({
  alertIds: new Set(),
  toggleAlert: () => {},
  hasAlert: () => false,
})

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertIds, setAlertIds] = useState<Set<ConcertId>>(new Set())

  // 只使用 sale_start_at 欄位；date_str 是演出日期，不能拿來當開賣時間
  const parseSaleDateTime = (concert: Concert): Date | null => {
    if (!concert.sale_start_at) return null
    const d = new Date(concert.sale_start_at)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const triggerReminder = async (concert: Concert) => {
    const message = `「${concert.artist}」即將開搶，請於 10 分鐘內準備搶票！`

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      // 無法發原生通知，頁面在前景才用 alert 避免打擾
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        window.alert(`🔔 搶票提醒\n${message}`)
      }
      return
    }

    // 優先走 Service Worker showNotification（背景也能顯示）
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification('🎤 搶票提醒', {
          body: message,
          icon: '/lyve-logo.png',
          badge: '/lyve-logo.png',
          tag: `alert-${concert.id}`,
          data: { url: '/alerts' },
        })
        return
      } catch {
        // SW 還沒就緒，fallback 到直接 API
      }
    }

    new Notification('🎤 搶票提醒', { body: message, icon: '/lyve-logo.png' })
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('alerts')
      if (saved) {
        setAlertIds(new Set<ConcertId>(JSON.parse(saved)))
      }
    } catch {}
  }, [])

  const toggleAlert = (concertId: ConcertId) => {
    setAlertIds((prev) => {
      const next = new Set(prev)
      if (next.has(concertId)) {
        next.delete(concertId)
        try {
          const rawReminded = localStorage.getItem(REMINDED_STORAGE_KEY)
          const remindedIds = new Set<ConcertId>(rawReminded ? JSON.parse(rawReminded) : [])
          remindedIds.delete(concertId)
          localStorage.setItem(REMINDED_STORAGE_KEY, JSON.stringify([...remindedIds]))
        } catch {}
      } else {
        next.add(concertId)

        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {})
        }
      }
      localStorage.setItem('alerts', JSON.stringify([...next]))
      return next
    })
  }

  const hasAlert = (concertId: ConcertId) => alertIds.has(concertId)

  useEffect(() => {
    if (alertIds.size === 0) return

    const supabase = createClient()
    let mounted = true

    const checkAlerts = async () => {
      const ids = [...alertIds]
      if (ids.length === 0) return

      const { data, error } = await supabase
        .from('concerts')
        .select('*')
        .in('id', ids)
        .eq('status', 'pending')

      if (error || !data || !mounted) return

      let remindedIds = new Set<ConcertId>()
      try {
        const rawReminded = localStorage.getItem(REMINDED_STORAGE_KEY)
        remindedIds = new Set<ConcertId>(rawReminded ? JSON.parse(rawReminded) : [])
      } catch {
        remindedIds = new Set<ConcertId>()
      }
      const now = Date.now()
      let changed = false

      for (const concert of data as Concert[]) {
        if (remindedIds.has(concert.id)) continue

        const saleAt = parseSaleDateTime(concert)
        if (!saleAt) continue

        const saleAtMs = saleAt.getTime()
        const reminderAtMs = saleAtMs - REMINDER_OFFSET_MS

        if (now >= reminderAtMs && now <= saleAtMs + 5 * 60 * 1000) {
          await triggerReminder(concert)
          remindedIds.add(concert.id)
          changed = true
        }
      }

      if (changed) {
        localStorage.setItem(REMINDED_STORAGE_KEY, JSON.stringify([...remindedIds]))
      }
    }

    checkAlerts()
    const timer = window.setInterval(checkAlerts, 60 * 1000)

    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [alertIds])

  return (
    <AlertContext.Provider value={{ alertIds, toggleAlert, hasAlert }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  return useContext(AlertContext)
}
