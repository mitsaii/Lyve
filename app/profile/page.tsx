'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSaved } from '@/contexts/SavedContext'
import { ConcertCard } from '@/components/concerts/ConcertCard'
import { ConcertModal } from '@/components/concerts/ConcertModal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { IconHeart, IconMusic } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function ProfilePage() {
  const { t } = useLang()
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const { savedIds, savedSynced } = useSaved()
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)

  useEffect(() => {
    // 等 DB 同步完成後再判斷，避免登入後短暫顯示「空收藏」
    if (!user || !savedSynced) {
      setConcerts([])
      return
    }
    if (savedIds.size === 0) {
      setConcerts([])
      return
    }

    const fetchSavedConcerts = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('concerts')
        .select('*')
        .in('id', Array.from(savedIds))
        .order('date_str', { ascending: true })

      if (!error && data) {
        setConcerts(data as Concert[])
      }
    }

    fetchSavedConcerts()
  }, [savedIds, savedSynced, user])

  const Spinner = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      />
    </div>
  )

  // Auth 尚未初始化 or 已登入但收藏尚未從 DB 同步完成
  if (loading || (user && !savedSynced)) return <Spinner />

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'var(--faint)', fontSize: '2.5rem' }}
        >
          👤
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            {t('登入以使用收藏', 'Sign in to Save Concerts')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {t('登入後即可收藏演出，跨裝置同步', 'Sign in to save and sync concerts across devices')}
          </p>
        </div>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 px-6 py-3 rounded-xl font-medium text-sm transition-opacity hover:opacity-80"
          style={{
            background: 'var(--faint)',
            color: 'var(--text)',
            border: '1px solid var(--border, var(--faint))',
          }}
        >
          <GoogleIcon />
          {t('以 Google 帳號登入', 'Sign in with Google')}
        </button>
      </div>
    )
  }

  const displayName = user.user_metadata?.full_name || user.email || ''
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  return (
    <>
      <div className="pb-24 min-h-screen">
        <div className="p-4 space-y-4">
          {/* 使用者資訊卡 */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--faint)' }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="avatar"
                width={48}
                height={48}
                className="rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {displayName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                {displayName}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {user.email}
              </p>
            </div>
            <button
              onClick={signOut}
              className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0"
              style={{ background: 'var(--card)', color: 'var(--muted)' }}
            >
              {t('登出', 'Sign out')}
            </button>
          </div>

          {/* 收藏的演出 */}
          <SectionLabel
            icon={<IconHeart filled className="w-4 h-4" />}
            text={t('收藏的演出', 'Saved Concerts')}
          />

          {concerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <IconMusic className="w-14 h-14" />
              </div>
              <p style={{ color: 'var(--muted)' }}>
                {t('還沒有收藏任何演出', 'No saved concerts yet')}
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                {t('點選演出卡片上的愛心即可收藏', 'Tap the heart icon to save concerts')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {concerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  onClick={() => setSelectedConcert(concert)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConcertModal concert={selectedConcert} onClose={() => setSelectedConcert(null)} />
    </>
  )
}
