import type { Status, Genre, Lang, Concert } from '@/types/concert'

/**
 * Deduplicate concerts by artist + date_str.
 * Different scrapers may produce the same concert with slightly different tour_zh,
 * bypassing the DB unique constraint. Prefer the record with sale_start_at set.
 *
 * 重要：必須以穩定順序處理，否則 Postgres 相同 sort key 會回傳隨機順序，
 * 導致不同頁面（首頁 / /alerts / /saved）dedup 選到不同重複，造成
 * 「首頁收藏/開啟提醒 → 切到 /alerts 鈴鐵沒亮」這類 id 對不起來的 bug。
 */
export function deduplicateConcerts(concerts: Concert[]): Concert[] {
  // 先以 id 排序，確保相同資料集在任何頁面 dedup 出來的勝出者一致
  const sorted = [...concerts].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  )
  const seen = new Map<string, Concert>()
  for (const c of sorted) {
    const key = `${c.artist}|${c.date_str}`
    const existing = seen.get(key)
    if (!existing || (!existing.sale_start_at && c.sale_start_at)) {
      seen.set(key, c)
    }
  }
  return [...seen.values()]
}

export function statusLabel(status: Status, lang: Lang): string {
  const labels: Record<Status, { zh: string; en: string }> = {
    selling:  { zh: '熱賣中', en: 'On Sale' },
    pending:  { zh: '待公告', en: 'Coming Soon' },
    free:     { zh: '免費', en: 'Free' },
    ended:    { zh: '已結束', en: 'Ended' },
    sold_out: { zh: '已售完', en: 'Sold Out' },
  }
  return labels[status][lang]
}

export function tagColor(status: Status): string {
  const colors: Record<Status, string> = {
    selling:  'var(--accent3)', // green
    pending:  '#a78bfa',        // purple — 場地待定
    free:     '#f59e0b',        // amber  — 免費活動
    ended:    'var(--muted)',   // gray   — 演唱會日期已過（自動）
    sold_out: '#ef4444',        // red    — 已售完
  }
  return colors[status]
}

export function genreLabel(genre: Genre, lang: Lang): string {
  const labels = {
    all: { zh: '全部', en: 'All' },
    cpop: { zh: '華語', en: 'C-Pop' },
    bands: { zh: '樂團', en: 'Bands' },
    hiphop: { zh: 'Hip-Hop', en: 'Hip-Hop' },
    kpop: { zh: 'K-POP', en: 'K-POP' },
    jpop: { zh: 'J-POP', en: 'J-POP' },
    western: { zh: '西洋', en: 'Western' },
    festival: { zh: '音樂祭', en: 'Festival' },
  }
  return labels[genre][lang]
}

export function formatDate(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr)
  if (lang === 'zh') {
    return date.toLocaleDateString('zh-TW', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    })
  }
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

/**
 * 把 "YYYY/MM/DD" 或 "YYYY-MM-DD" 解析為 Asia/Taipei 當天 00:00 的 Date。
 * 直接 new Date("YYYY-MM-DD") 會被當成 UTC 0 點，等於台灣早上 8 點，
 * 倒數 / 篩選會因此差 8 小時，所以這裡明確指定 +08:00。
 */
function taipeiMidnight(ymd: string): Date {
  return new Date(`${ymd.replace(/\//g, '-')}T00:00:00+08:00`)
}

export function calcCountdown(targetDate: string) {
  // 處理日期範圍格式 (如 '2026/04/25–26' 或 '2026/03/20-22')，提取第一天
  const dateStr = targetDate.split('–')[0].split('-')[0].trim()

  const now = new Date().getTime()
  const target = taipeiMidnight(dateStr).getTime()
  const diff = target - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds }
}

/**
 * 解析 date_str 的第一天（處理範圍格式如 '2026/04/25–26' 或 '2026/04/25-26'）。
 * 回傳該日 Asia/Taipei 00:00 的 Date。
 */
export function parseFirstDate(dateStr: string): Date {
  const firstPart = dateStr.split('–')[0].split('-')[0].trim()
  return taipeiMidnight(firstPart)
}

/**
 * 解析 date_str 的最後一天（用於判斷演唱會是否已結束）。
 * 回傳該日 Asia/Taipei 00:00 的 Date。
 */
export function parseLastDate(dateStr: string): Date {
  const parts = dateStr.split(/[–-]/)
  let lastStr: string
  if (parts.length === 2) {
    const prefix = parts[0].trim() // e.g. "2026/04/25"
    const day = parts[1].trim().padStart(2, '0')
    lastStr = `${prefix.substring(0, 7)}/${day}` // "2026/04/26"
  } else {
    lastStr = parts[0].trim()
  }
  return taipeiMidnight(lastStr)
}

/**
 * 判斷是否為真正的售票平台（可直接導購票連結）
 * 旅遊套裝業者（可樂旅遊）或新聞網站不算售票平台
 */
const NON_TICKETING_PLATFORMS = new Set([
  '可樂旅遊',
  '網路新聞',
])

export function isTicketingPlatform(platform: string): boolean {
  return !NON_TICKETING_PLATFORMS.has(platform)
}

export function getVisiblePageItems(currentPage: number, totalPages: number, maxVisiblePages = 5) {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items: Array<number | 'start-ellipsis' | 'end-ellipsis'> = [1]
  const middleSlots = maxVisiblePages - 2
  const halfWindow = Math.floor(middleSlots / 2)
  let startPage = Math.max(2, currentPage - halfWindow)
  const endPage = Math.min(totalPages - 1, startPage + middleSlots - 1)

  if (endPage === totalPages - 1) {
    startPage = Math.max(2, endPage - middleSlots + 1)
  }

  if (startPage > 2) {
    items.push('start-ellipsis')
  }

  for (let page = startPage; page <= endPage; page += 1) {
    items.push(page)
  }

  if (endPage < totalPages - 1) {
    items.push('end-ellipsis')
  }

  items.push(totalPages)

  return items
}
