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

  const parseSaleDateTime = (concert: Concert) => {
    const firstDatePart = concert.date_str.split('–')[0].split('-')[0].trim()
    const saleDate = new Date(firstDatePart.replace(/\//g, '-'))
    if (Number.isNaN(saleDate.getTime())) return null

    const timeMatch = concert.date_str.match(/(\d{1,2}):(\d{2})/)
    if (timeMatch) {
      const hours = Number.parseInt(timeMatch[1], 10)
      const minutes = Number.parseInt(timeMatch[2], 10)
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        saleDate.setHours(hours, minutes, 0, 0)
      }
    } else {
      saleDate.setHours(0, 0, 0, 0)
    }

    return saleDate
  }

  const triggerReminder = (concert: Concert) => {
    const message = `「${concert.artist}」即將開搶，請於 10 分鐘內準備搶票！`

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('搶票提醒', { body: message })
      return
    }

    window.alert(`🔔 搶票提醒\n${message}`)
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
          triggerReminder(concert)
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
