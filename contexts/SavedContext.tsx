'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ConcertId } from '@/types/concert'

interface SavedContextType {
  savedIds: Set<ConcertId>
  savedSynced: boolean  // DB 同步是否完成（避免登入後短暫顯示空收藏）
  toggleSave: (concertId: ConcertId) => Promise<boolean>  // true = 新增收藏, false = 取消收藏
  isSaved: (concertId: ConcertId) => boolean
}

const SavedContext = createContext<SavedContextType>({
  savedIds: new Set(),
  savedSynced: false,
  toggleSave: async () => false,
  isSaved: () => false,
})

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<ConcertId>>(new Set())
  const [savedSynced, setSavedSynced] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  // 當登入狀態改變時，從資料庫同步收藏
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set())
      setSavedSynced(true)  // 未登入視為已同步（空集合）
      return
    }

    setSavedSynced(false)
    const supabase = createClient()
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('saved_concerts')
          .select('concert_id')
        if (error) {
          console.error('[SavedContext] fetch failed:', error.message)
        }
        if (data) {
          setSavedIds(new Set<ConcertId>(data.map((item) => item.concert_id as ConcertId)))
        }
      } catch (err) {
        console.error('[SavedContext] unexpected error:', err)
      } finally {
        setSavedSynced(true)  // 確保不論成功或失敗都不會卡在 loading 狀態
      }
    })()
  }, [user])

  const toggleSave = async (concertId: ConcertId): Promise<boolean> => {
    // 未登入時導向個人中心
    if (!user) {
      router.push('/profile')
      return false
    }

    const supabase = createClient()
    const isAdding = !savedIds.has(concertId)

    // 樂觀更新 UI（先更新，失敗再回滾）
    setSavedIds((prev) => {
      const next = new Set(prev)
      isAdding ? next.add(concertId) : next.delete(concertId)
      return next
    })

    if (!isAdding) {
      const { error } = await supabase
        .from('saved_concerts')
        .delete()
        .eq('user_id', user.id)
        .eq('concert_id', concertId)
      if (error) {
        console.error('[SavedContext] delete failed:', error.message)
        // 回滾
        setSavedIds((prev) => { const next = new Set(prev); next.add(concertId); return next })
        return false
      }
    } else {
      const { error } = await supabase
        .from('saved_concerts')
        .insert({ user_id: user.id, concert_id: concertId })
      if (error) {
        console.error('[SavedContext] insert failed:', error.message)
        // 回滾
        setSavedIds((prev) => { const next = new Set(prev); next.delete(concertId); return next })
        return false
      }
    }

    return isAdding
  }

  const isSaved = (concertId: ConcertId) => savedIds.has(concertId)

  return (
    <SavedContext.Provider value={{ savedIds, savedSynced, toggleSave, isSaved }}>
      {children}
    </SavedContext.Provider>
  )
}

export function useSaved() {
  return useContext(SavedContext)
}
