'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { UserTicket, TicketColor, TICKET_COLORS } from '@/types/ticket'
import { useLang } from '@/contexts/LangContext'

interface AddTicketModalProps {
  onClose: () => void
  onSave: (ticket: UserTicket) => void
}

const COLOR_OPTIONS: TicketColor[] = ['navy', 'slate', 'purple', 'rose', 'amber', 'teal']

export function AddTicketModal({ onClose, onSave }: AddTicketModalProps) {
  const { lang } = useLang()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    concertName: '',
    artist: '',
    venue: '',
    dateStr: new Date().toISOString().split('T')[0],
    color: 'navy' as TicketColor,
    notes: '',
  })
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imagePreview, setImagePreview] = useState<string>('')

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      alert(lang === 'zh' ? '圖片大小不能超過 4MB' : 'Image must be under 4MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setImageUrl(result)
      setImagePreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.concertName.trim() || !form.artist.trim() || !form.dateStr) return

    const ticket: UserTicket = {
      id: crypto.randomUUID(),
      concertName: form.concertName.trim(),
      artist: form.artist.trim(),
      venue: form.venue.trim() || undefined,
      dateStr: form.dateStr,
      imageUrl: imageUrl || undefined,
      color: form.color,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    onSave(ticket)
    onClose()
  }

  const t = (zh: string, en: string) => lang === 'zh' ? zh : en

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--faint)' }} />
        </div>

        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
              {t('新增門票', 'Add Ticket')}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'var(--faint)', color: 'var(--muted)' }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 圖片上傳 */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
                {t('封面圖片（選填）', 'Cover Image (optional)')}
              </label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={imagePreview} alt="preview" fill className="object-cover" sizes="80px" />
                  </div>
                ) : (
                  <div
                    className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                    style={{ background: 'var(--faint)' }}
                  >
                    🎫
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm px-4 py-2 rounded-xl font-medium"
                    style={{ background: 'var(--faint)', color: 'var(--text)' }}
                  >
                    {t('選擇圖片', 'Choose Image')}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => { setImageUrl(''); setImagePreview('') }}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--faint)', color: 'var(--muted)' }}
                    >
                      {t('移除', 'Remove')}
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* 演唱會名稱 */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
                {t('演唱會 / 活動名稱', 'Concert / Event Name')} <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="text"
                value={form.concertName}
                onChange={e => setForm(f => ({ ...f, concertName: e.target.value }))}
                placeholder={t('e.g. YOURS DOYOUNG ENCORE CONCERT', 'e.g. YOURS DOYOUNG ENCORE CONCERT')}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{
                  background: 'var(--faint)',
                  color: 'var(--text)',
                  border: '1px solid transparent',
                }}
              />
            </div>

            {/* 藝人 */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
                {t('藝人', 'Artist')} <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="text"
                value={form.artist}
                onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
                placeholder={t('e.g. DOYOUNG', 'e.g. DOYOUNG')}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--faint)', color: 'var(--text)' }}
              />
            </div>

            {/* 場地 + 日期 - 兩欄 */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
                  {t('場地（選填）', 'Venue (opt.)')}
                </label>
                <input
                  type="text"
                  value={form.venue}
                  onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                  placeholder={t('e.g. 台北小巨蛋', 'e.g. Taipei Arena')}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--faint)', color: 'var(--text)' }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
                  {t('日期', 'Date')} <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={form.dateStr}
                  onChange={e => setForm(f => ({ ...f, dateStr: e.target.value }))}
                  required
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--faint)', color: 'var(--text)' }}
                />
              </div>
            </div>

            {/* 顏色主題 */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
                {t('票根顏色', 'Ticket Color')}
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(color => {
                  const theme = TICKET_COLORS[color]
                  const selected = form.color === color
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: theme.bg,
                        color: '#fff',
                        border: selected ? `2px solid ${theme.border}` : '2px solid transparent',
                        boxShadow: selected ? `0 0 10px ${theme.border}66` : 'none',
                        fontSize: '11px',
                      }}
                    >
                      {lang === 'zh' ? theme.labelZh : theme.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
                {t('備註（選填）', 'Notes (optional)')}
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={t('座位、票種、回憶…', 'Seat, ticket type, memories…')}
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--faint)', color: 'var(--text)' }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl font-bold text-sm mt-2"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(255,51,85,0.4)',
              }}
            >
              {t('儲存票根', 'Save Ticket')}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
