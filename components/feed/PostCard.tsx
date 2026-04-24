'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Post, Comment } from '@/types/post'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LangContext'

// 模組層建立一次，避免 useEffect 依賴警告
const supabase = createClient()

interface PostCardProps {
  post: Post
}

function timeAgo(dateStr: string, lang: 'zh' | 'en'): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (lang === 'zh') {
    if (mins < 1) return '剛剛'
    if (mins < 60) return `${mins} 分鐘前`
    if (hours < 24) return `${hours} 小時前`
    return `${days} 天前`
  } else {
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth()
  const { t, lang } = useLang()

  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // 檢查是否已愛心
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user) return
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data))
  }, [user, post.id])

  // 載入留言
  const loadComments = async () => {
    if (commentsLoading) return
    setCommentsLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments((data as Comment[]) || [])
    setCommentsLoading(false)
  }

  const toggleComments = () => {
    const next = !showComments
    setShowComments(next)
    if (next && comments.length === 0) loadComments()
  }

  // 愛心 toggle
  const toggleLike = async () => {
    if (!user) return
    if (liked) {
      setLiked(false)
      setLikesCount(c => Math.max(c - 1, 0))
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    } else {
      setLiked(true)
      setLikesCount(c => c + 1)
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
    }
  }

  // 送出留言
  const submitComment = async () => {
    if (!user || !newComment.trim() || submitting) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() })
      .select()
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data as Comment])
      setNewComment('')
    }
    setSubmitting(false)
  }

  const isLong = post.content.length > 180
  const displayContent = isLong && !expanded ? post.content.slice(0, 180) + '...' : post.content

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--faint)',
      }}
    >
      {/* 圖片 */}
      {post.image_url && (
        <div className="relative w-full" style={{ height: '200px' }}>
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 480px) 100vw, 480px"
          />
          {/* AI 標籤 */}
          {post.is_ai_generated && (
            <span
              className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent)', color: '#fff', opacity: 0.9 }}
            >
              ✦ AI
            </span>
          )}
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* 平台頭像 + 時間 */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              color: '#fff',
            }}
          >
            ✦
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              Lyve
            </span>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
              {timeAgo(post.created_at, lang as 'zh' | 'en')}
              {post.is_ai_generated && (
                <span className="ml-1.5" style={{ color: 'var(--accent)' }}>
                  · AI 生成
                </span>
              )}
            </span>
          </div>
        </div>

        {/* 標題 */}
        <h2 className="text-sm font-bold leading-snug" style={{ color: 'var(--text)' }}>
          {post.title}
        </h2>

        {/* 內文 */}
        <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--muted)' }}>
          {displayContent}
          {isLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="ml-1 text-[11px] font-medium"
              style={{ color: 'var(--accent)' }}
            >
              {expanded ? t('收起', 'less') : t('展開', 'more')}
            </button>
          )}
        </p>

        {/* 標籤 */}
        {/* 互動列 */}
        <div
          className="flex items-center gap-4 pt-1"
          style={{ borderTop: '1px solid var(--faint)' }}
        >
          {/* 愛心 */}
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 text-xs transition-all active:scale-90"
            style={{ color: liked ? 'var(--accent)' : 'var(--muted)' }}
            disabled={!user}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>{likesCount}</span>
          </button>

          {/* 留言 */}
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-xs transition-all"
            style={{ color: showComments ? 'var(--accent2)' : 'var(--muted)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{post.comments_count}</span>
          </button>

          {/* 分享 */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: post.title, text: post.content.slice(0, 100), url: window.location.href })
              }
            }}
            className="flex items-center gap-1.5 text-xs ml-auto transition-all"
            style={{ color: 'var(--muted)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>

        {/* 留言區塊 */}
        {showComments && (
          <div className="flex flex-col gap-3 pt-1">
            {commentsLoading ? (
              <p className="text-xs text-center py-2" style={{ color: 'var(--muted)' }}>
                {t('載入留言中...', 'Loading comments...')}
              </p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: 'var(--muted)' }}>
                {t('還沒有留言，來搶頭香！', 'No comments yet. Be the first!')}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2 items-start">
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--faint)', color: 'var(--accent2)' }}
                    >
                      {c.user_display_name?.[0]?.toUpperCase() ?? '🎵'}
                    </div>
                    <div
                      className="flex-1 rounded-xl px-3 py-2"
                      style={{ background: 'var(--bg)', border: '1px solid var(--faint)' }}
                    >
                      <p className="text-[11px] font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
                        {c.user_display_name ?? t('匿名粉絲', 'Fan')}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
                        {c.content}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                        {timeAgo(c.created_at, lang as 'zh' | 'en')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 輸入留言 */}
            {user ? (
              <div className="flex gap-2 items-center">
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#fff' }}
                >
                  {user.email?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div
                  className="flex-1 flex items-center gap-2 rounded-full px-3 py-2"
                  style={{ background: 'var(--bg)', border: '1px solid var(--faint)' }}
                >
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                    placeholder={t('留言...', 'Write a comment...')}
                    maxLength={500}
                    className="flex-1 bg-transparent text-xs outline-none"
                    style={{ color: 'var(--text)' }}
                  />
                  <button
                    onClick={submitComment}
                    disabled={!newComment.trim() || submitting}
                    className="text-xs font-semibold disabled:opacity-40 transition-opacity"
                    style={{ color: 'var(--accent)' }}
                  >
                    {t('送出', 'Send')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-center py-1" style={{ color: 'var(--muted)' }}>
                {t('登入後才能留言', 'Sign in to comment')}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
