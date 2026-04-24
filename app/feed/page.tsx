'use client'

import { useState, useEffect, useRef } from 'react'
import { Post } from '@/types/post'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/contexts/LangContext'
import { PostCard } from '@/components/feed/PostCard'

const PAGE_SIZE = 10
// 模組層建立一次，避免每次 render 重建（解決 useCallback 依賴警告）
const supabase = createClient()

export default function FeedPage() {
  const { t } = useLang()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<'all' | 'ai'>('all')

  // 用 ref 追蹤目前已載入的數量，避免 stale closure
  const postsLenRef = useRef(0)

  const fetchPosts = async (reset = false) => {
    const from = reset ? 0 : postsLenRef.current
    if (!reset) setLoadingMore(true)
    else setLoading(true)

    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filter === 'ai') {
      query = query.eq('is_ai_generated', true)
    }

    const { data, error } = await query

    if (!error && data) {
      const newPosts = data as Post[]
      setPosts(prev => {
        const next = reset ? newPosts : [...prev, ...newPosts]
        postsLenRef.current = next.length
        return next
      })
      setHasMore(newPosts.length === PAGE_SIZE)
    }
    setLoading(false)
    setLoadingMore(false)
  }

  // filter 變更時重新載入
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPosts(true) }, [filter])

  return (
    <div className="pb-28 min-h-screen">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-4 pb-3 flex flex-col gap-3"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--faint)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-bold tracking-tight"
              style={{
                background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('動態', 'Feed')}
            </h1>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
              {t('最新追星動態', 'Latest fan updates')}
            </p>
          </div>
        </div>

        {/* 篩選 chips */}
        <div className="flex gap-2">
          {(['all', 'ai'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                background: filter === f ? 'var(--accent)' : 'var(--surface)',
                color: filter === f ? '#fff' : 'var(--muted)',
                border: filter === f ? 'none' : '1px solid var(--faint)',
              }}
            >
              {f === 'all' ? t('全部', 'All') : t('✦ AI 追星', '✦ AI Posts')}
            </button>
          ))}
        </div>
      </div>

      {/* 貼文列表 */}
      <div className="px-4 py-4 flex flex-col gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--faint)', height: '180px' }}
            />
          ))
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-5xl">✦</span>
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
              {t('還沒有貼文，點右上角 AI 發文試試看！', 'No posts yet. Try AI Post!')}
            </p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}

            {hasMore && (
              <button
                onClick={() => fetchPosts(false)}
                disabled={loadingMore}
                className="w-full py-3 rounded-2xl text-sm font-medium transition-all"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--muted)',
                  border: '1px solid var(--faint)',
                }}
              >
                {loadingMore ? t('載入中...', 'Loading...') : t('載入更多', 'Load more')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
