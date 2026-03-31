// types/concert.ts

export type Genre = 'all' | 'cpop' | 'rock' | 'kpop' | 'jpop' | 'western' | 'festival'
export type Status = 'selling' | 'pending' | 'sold_out'
export type Lang = 'zh' | 'en'
export type Theme = 'dark' | 'light'
export type ConcertId = string

export interface Concert {
  id: ConcertId
  artist: string
  emoji: string
  genre: Genre
  tour_zh: string
  tour_en: string
  venue_zh: string
  venue_en: string
  city_zh: string
  city_en: string
  date_str: string        // 顯示: "2026/04/25–26"
  price_zh: string
  price_en: string
  platform: string
  platform_url: string
  status: Status
  is_hot: boolean
  grad_css: string | null
  image_url?: string | null
  sale_start_at?: string | null   // ISO 8601, e.g. "2026-04-01T10:00:00+08:00"
  created_at?: string
}

export interface SavedConcert {
  id: string
  user_id: string
  concert_id: ConcertId
  created_at: string
}
