'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Concert } from '@/types/concert'
import { useSaved } from '@/contexts/SavedContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'
import { ConcertCard } from '@/components/concerts/ConcertCard'
import { ConcertModal } from '@/components/concerts/ConcertModal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { IconHeart } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'

export default function SavedPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { savedIds, savedSynced } = useSaved()
  const { t } = useLang()

  const [savedConcerts, setSavedConcerts] = useState<Concert[]>([])
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/profile')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    // savedSynced 確保 DB 同步完成後才判斷空集合，避免先閃一下「沒有收藏」
    if (!savedSynced) {
      setLoading(true)
      return
    }

    let cancelled = false

    async function fetchSaved() {
      setLoading(true)
      if (savedIds.size === 0) {
        if (!cancelled) {
          setSavedConcerts([])
          setLoading(false)
        }
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('concerts')
        .select('*')
        .in('id', Array.from(savedIds))
        .order('date_str', { ascending: true })

      if (cancelled) return

      if (error) {
        console.error('[SavedPage] fetch failed:', error.message)
        setSavedConcerts([])
      } else if (data) {
        // 已結束的活動排最後，其餘依日期排序
        const sorted = (data as Concert[]).sort((a, b) => {
          const aEnded = a.status === 'ended' ? 1 : 0
          const bEnded = b.status === 'ended' ? 1 : 0
          if (aEnded !== bEnded) return aEnded - bEnded
          return a.date_str.localeCompare(b.date_str)
        })
        setSavedConcerts(sorted)
      }
      setLoading(false)
    }

    fetchSaved()

    return () => { cancelled = true }
  }, [user, savedIds, savedSynced])

  if (authLoading || (!user && !authLoading)) return null

  return (
    <div className="px-4 py-2">
      <SectionLabel
        icon={<IconHeart filled className="w-4 h-4" />}
        text={t('我的收藏', 'My Saved')}
      />

      {loading ? (
        <div className="space-y-3 mt-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-32 rounded-2xl animate-pulse"
              style={{ background: 'var(--surface)' }}
            />
          ))}
        </div>
      ) : savedConcerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <span className="text-5xl">💔</span>
          <p className="text-center" style={{ color: 'var(--muted)' }}>
            {t('還沒有收藏的演唱會', 'No saved concerts yet')}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-xl font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {t('去探索演唱會', 'Explore Concerts')}
          </button>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
            {t(`共 ${savedConcerts.length} 場`, `${savedConcerts.length} concerts`)}
          </p>
          {savedConcerts.map(concert => (
            <ConcertCard
              key={concert.id}
              concert={concert}
              onClick={() => setSelectedConcert(concert)}
            />
          ))}
        </div>
      )}

      <ConcertModal
        concert={selectedConcert}
        onClose={() => setSelectedConcert(null)}
      />
    </div>
  )
}
