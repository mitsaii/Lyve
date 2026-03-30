import type { Status, Genre, Lang } from '@/types/concert'

export function statusLabel(status: Status, lang: Lang): string {
  const labels = {
    selling: { zh: '熱賣中', en: 'On Sale' },
    pending: { zh: '待公告', en: 'Coming Soon' },
    sold_out: { zh: '已售完', en: 'Sold Out' },
  }
  return labels[status][lang]
}

export function tagColor(status: Status): string {
  const colors = {
    selling: 'var(--accent3)', // green
    pending: '#a78bfa',        // purple
    sold_out: 'var(--muted)',  // gray
  }
  return colors[status]
}

export function genreLabel(genre: Genre, lang: Lang): string {
  const labels = {
    all: { zh: '全部', en: 'All' },
    cpop: { zh: '華語', en: 'C-Pop' },
    rock: { zh: '搖滾', en: 'Rock' },
    kpop: { zh: 'K-POP', en: 'K-POP' },
    jpop: { zh: 'J-POP', en: 'J-POP' },
    western: { zh: '歐美', en: 'Western' },
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

export function calcCountdown(targetDate: string) {
  // 處理日期範圍格式 (如 '2026/04/25–26' 或 '2026/03/20-22')
  // 提取第一天的日期
  let dateStr = targetDate.split('–')[0].split('-')[0].trim()
  
  // 將 YYYY/MM/DD 格式轉換為標準格式
  dateStr = dateStr.replace(/\//g, '-')
  
  const now = new Date().getTime()
  const target = new Date(dateStr).getTime()
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
