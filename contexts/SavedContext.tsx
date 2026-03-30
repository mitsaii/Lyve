'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ConcertId } from '@/types/concert'

interface SavedContextType {
  savedIds: Set<ConcertId>
  toggleSave: (concertId: ConcertId) => Promise<void>
  isSaved: (concertId: ConcertId) => boolean
}

const SavedContext = createContext<SavedContextType>({
  savedIds: new Set(),
  toggleSave: async () => {},
  isSaved: () => false,
})

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<ConcertId>>(new Set())
  const { user } = useAuth()
  const router = useRouter()

  // 當登入狀態改變時，從資料庫同步收藏
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set())
      return
    }

    const supabase = createClient()
    supabase
      .from('saved_concerts')
      .select('concert_id')
      .then(({ data }) => {
        if (data) {
          setSavedIds(new Set<ConcertId>(data.map((item) => item.concert_id as ConcertId)))
        }
      })
  }, [user])

  const toggleSave = async (concertId: ConcertId) => {
    // 未登入時導向個人中心
    if (!user) {
      router.push('/profile')
      return
    }

    const supabase = createClient()
    const newSavedIds = new Set(savedIds)

    if (newSavedIds.has(concertId)) {
      newSavedIds.delete(concertId)
      await supabase
        .from('saved_concerts')
        .delete()
        .eq('user_id', user.id)
        .eq('concert_id', concertId)
    } else {
      newSavedIds.add(concertId)
      await supabase
        .from('saved_concerts')
        .insert({ user_id: user.id, concert_id: concertId })
    }

    setSavedIds(newSavedIds)
  }

  const isSaved = (concertId: ConcertId) => savedIds.has(concertId)

  return (
    <SavedContext.Provider value={{ savedIds, toggleSave, isSaved }}>
      {children}
    </SavedContext.Provider>
  )
}

export function useSaved() {
  return useContext(SavedContext)
}
