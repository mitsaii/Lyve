'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Concert, ConcertId } from '@/types/concert'
import { useAuth } from '@/contexts/AuthContext'

const REMINDER_OFFSET_MS = 10 * 60 * 1000
const REMINDED_STORAGE_KEY = 'alert-reminded-ids'

interface AlertContextType {
  alertIds: Set<ConcertId>
  toggleAlert: (concertId: ConcertId) => void
  hasAlert: (concertId: ConcertId) => boolean
  pushSupported: boolean
  pushPermission: NotificationPermission | 'unsupported'
}

const AlertContext = createContext<AlertContextType>({
  alertIds: new Set(),
  toggleAlert: () => {},
  hasAlert: () => false,
  pushSupported: false,
  pushPermission: 'unsupported',
})

// ── Web Push helpers ──────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
  return arr.buffer as ArrayBuffer
}

async function subscribePush(concertId: ConcertId): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!publicKey) return false
  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), concertId, action: 'subscribe' }),
    })
    return true
  } catch (e) {
    console.error('[push] subscribe failed', e)
    return false
  }
}

async function unsubscribePush(concertId: ConcertId): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), concertId, action: 'unsubscribe' }),
    })
  } catch (e) {
    console.error('[push] unsubscribe failed', e)
  }
}

// ── Provider ──────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alertIds, setAlertIds] = useState<Set<ConcertId>>(new Set())
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const { user } = useAuth()
  const router = useRouter()

  const parseSaleDateTime = (concert: Concert): Date | null => {
    if (!concert.sale_start_at) return null
    const d = new Date(concert.sale_start_at)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const triggerLocalNotification = async (concert: Concert) => {
    const message = `「${concert.artist}」即將開搶，請於 10 分鐘內準備搶票！`
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        window.alert(`🔔 搶票提醒\n${message}`)
      }
      return
    }
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
      } catch {}
    }
    new Notification('🎤 搶票提醒', { body: message, icon: '/lyve-logo.png' })
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('alerts')
      if (saved) setAlertIds(new Set<ConcertId>(JSON.parse(saved)))
    } catch {}
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    setPushSupported(supported)
    if (supported) setPushPermission(Notification.permission)
  }, [])

  const toggleAlert = async (concertId: ConcertId) => {
    // 未登入時導向個人中心
    if (!user) {
      router.push('/profile')
      return
    }

    const isAdding = !alertIds.has(concertId)
    setAlertIds((prev) => {
      const next = new Set(prev)
      if (next.has(concertId)) {
        next.delete(concertId)
      } else {
        next.add(concertId)
      }
      localStorage.setItem('alerts', JSON.stringify([...next]))
      return next
    })

    if (isAdding) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        setPushPermission(perm)
        if (perm !== 'granted') return
      }
      await subscribePush(concertId)
    } else {
      try {
        const rawReminded = localStorage.getItem(REMINDED_STORAGE_KEY)
        const remindedIds = new Set<ConcertId>(rawReminded ? JSON.parse(rawReminded) : [])
        remindedIds.delete(concertId)
        localStorage.setItem(REMINDED_STORAGE_KEY, JSON.stringify([...remindedIds]))
      } catch {}
      await unsubscribePush(concertId)
    }
  }

  const hasAlert = (concertId: ConcertId) => alertIds.has(concertId)

  // 前景備用輪詢（瀏覽器開著時也檢查一次）
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
      } catch {}

      const now = Date.now()
      let changed = false
      for (const concert of data as Concert[]) {
        if (remindedIds.has(concert.id)) continue
        const saleAt = parseSaleDateTime(concert)
        if (!saleAt) continue
        const reminderAtMs = saleAt.getTime() - REMINDER_OFFSET_MS
        if (now >= reminderAtMs && now <= saleAt.getTime() + 5 * 60 * 1000) {
          await triggerLocalNotification(concert)
          remindedIds.add(concert.id)
          changed = true
        }
      }
      if (changed) localStorage.setItem(REMINDED_STORAGE_KEY, JSON.stringify([...remindedIds]))
    }

    checkAlerts()
    const timer = window.setInterval(checkAlerts, 60_000)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [alertIds])

  return (
    <AlertContext.Provider value={{ alertIds, toggleAlert, hasAlert, pushSupported, pushPermission }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  return useContext(AlertContext)
}
