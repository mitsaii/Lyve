'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Concert, Genre, Status } from '@/types/concert'

const ADMIN_EMAIL = 'mitsai0701@gmail.com'

const EMPTY_FORM: Partial<Concert> = {
  artist: '', emoji: '🎤', genre: 'cpop', tour_zh: '', tour_en: '',
  venue_zh: '', venue_en: '', city_zh: '台北', city_en: 'Taipei',
  date_str: '', price_zh: '', price_en: '', platform: '', platform_url: '',
  status: 'pending', is_hot: false, grad_css: null, image_url: '',
  sale_start_at: '',
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [editing, setEditing] = useState<Partial<Concert> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (isAdmin) fetchConcerts()
  }, [isAdmin])

  async function fetchConcerts() {
    const res = await fetch('/api/admin/concerts')
    if (res.ok) setConcerts(await res.json())
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch('/api/admin/concerts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      if (res.ok) {
        await fetchConcerts()
        setEditing(null)
        setIsNew(false)
      } else {
        const err = await res.json()
        alert('錯誤：' + err.error)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定刪除？')) return
    const res = await fetch('/api/admin/concerts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) fetchConcerts()
  }

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>載入中...</div>

  if (!user) return (
    <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
      請先登入
    </div>
  )

  if (!isAdmin) return (
    <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
      🚫 無管理員權限
    </div>
  )

  const filtered = concerts.filter(c =>
    c.artist.toLowerCase().includes(filter.toLowerCase()) ||
    c.tour_zh.includes(filter) ||
    c.tour_en.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          🔧 Admin
        </h1>
        <button
          onClick={() => { setEditing({ ...EMPTY_FORM }); setIsNew(true) }}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          + 新增
        </button>
      </div>

      {/* 搜尋 */}
      <input
        className="w-full px-4 py-3 rounded-xl mb-4 text-sm outline-none"
        style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--faint)' }}
        placeholder="搜尋演唱會..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      {/* 演唱會清單 */}
      <div className="space-y-2">
        {filtered.map(c => (
          <div
            key={c.id}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'var(--surface)' }}
          >
            <span className="text-2xl">{c.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate" style={{ color: 'var(--text)' }}>{c.artist}</div>
              <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {c.tour_zh} · {c.date_str} · {c.status}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setEditing({ ...c }); setIsNew(false) }}
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'var(--faint)', color: 'var(--text)' }}
              >
                編輯
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ background: '#ff4d4d22', color: '#ff4d4d' }}
              >
                刪除
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-8" style={{ color: 'var(--muted)' }}>沒有結果</p>
        )}
      </div>

      {/* 編輯 Modal */}
      {editing && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setEditing(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-w-[480px] mx-auto">
            <div
              className="rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--surface)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                  {isNew ? '新增演唱會' : '編輯演唱會'}
                </h2>
                <button onClick={() => setEditing(null)} style={{ color: 'var(--muted)' }}>✕</button>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'artist', label: '藝人名稱', type: 'text' },
                  { key: 'emoji', label: 'Emoji', type: 'text' },
                  { key: 'tour_zh', label: '巡演名稱（中）', type: 'text' },
                  { key: 'tour_en', label: '巡演名稱（英）', type: 'text' },
                  { key: 'venue_zh', label: '場館（中）', type: 'text' },
                  { key: 'venue_en', label: '場館（英）', type: 'text' },
                  { key: 'city_zh', label: '城市（中）', type: 'text' },
                  { key: 'city_en', label: '城市（英）', type: 'text' },
                  { key: 'date_str', label: '日期顯示', type: 'text', placeholder: '2026/04/25–26' },
                  { key: 'price_zh', label: '票價（中）', type: 'text' },
                  { key: 'price_en', label: '票價（英）', type: 'text' },
                  { key: 'platform', label: '售票平台', type: 'text' },
                  { key: 'platform_url', label: '購票連結', type: 'url' },
                  { key: 'image_url', label: '圖片 URL', type: 'url' },
                  { key: 'grad_css', label: '漸層 CSS（選填）', type: 'text' },
                  { key: 'sale_start_at', label: '開賣時間（ISO）', type: 'text', placeholder: '2026-04-01T10:00:00+08:00' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
                    <input
                      type={type}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--faint)', color: 'var(--text)', border: '1px solid transparent' }}
                      placeholder={placeholder}
                      value={(editing as Record<string, unknown>)[key] as string ?? ''}
                      onChange={e => setEditing(prev => ({ ...prev, [key]: e.target.value || null }))}
                    />
                  </div>
                ))}

                {/* Status */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>狀態</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--faint)', color: 'var(--text)' }}
                    value={editing.status ?? 'pending'}
                    onChange={e => setEditing(prev => ({ ...prev, status: e.target.value as Status }))}
                  >
                    <option value="pending">待公告</option>
                    <option value="selling">熱賣中</option>
                    <option value="sold_out">已售完</option>
                  </select>
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>類型</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--faint)', color: 'var(--text)' }}
                    value={editing.genre ?? 'cpop'}
                    onChange={e => setEditing(prev => ({ ...prev, genre: e.target.value as Genre }))}
                  >
                    <option value="cpop">華語</option>
                    <option value="rock">搖滾</option>
                    <option value="kpop">K-POP</option>
                    <option value="jpop">J-POP</option>
                    <option value="western">歐美</option>
                    <option value="festival">音樂祭</option>
                  </select>
                </div>

                {/* is_hot */}
                <div className="flex items-center gap-3">
                  <label className="text-sm" style={{ color: 'var(--text)' }}>熱門演唱會</label>
                  <input
                    type="checkbox"
                    checked={editing.is_hot ?? false}
                    onChange={e => setEditing(prev => ({ ...prev, is_hot: e.target.checked }))}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-3 rounded-xl font-bold"
                  style={{ background: 'var(--faint)', color: 'var(--muted)' }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-bold text-white"
                  style={{ background: 'var(--accent)', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
