// types/ticket.ts

export type TicketColor = 'navy' | 'slate' | 'purple' | 'rose' | 'amber' | 'teal'

export interface UserTicket {
  id: string
  concertName: string
  artist: string
  venue?: string
  dateStr: string       // e.g. "2025-10-11"
  imageUrl?: string     // base64 data URL or external URL
  color: TicketColor
  notes?: string
  createdAt: string
}

export const TICKET_COLORS: Record<TicketColor, { bg: string; border: string; label: string; labelZh: string }> = {
  navy:   { bg: 'linear-gradient(135deg,#0f1535 0%,#1a2560 100%)', border: '#3d5afe', label: 'Navy',   labelZh: '深藍' },
  slate:  { bg: 'linear-gradient(135deg,#2a2a3c 0%,#3f3f55 100%)', border: '#8080a0', label: 'Slate',  labelZh: '石板灰' },
  purple: { bg: 'linear-gradient(135deg,#1a0a2e 0%,#3b1278 100%)', border: '#9333ea', label: 'Purple', labelZh: '紫羅蘭' },
  rose:   { bg: 'linear-gradient(135deg,#2d0a14 0%,#7f1d1d 100%)', border: '#e11d48', label: 'Rose',   labelZh: '玫瑰紅' },
  amber:  { bg: 'linear-gradient(135deg,#1a1200 0%,#78350f 100%)', border: '#d97706', label: 'Amber',  labelZh: '琥珀金' },
  teal:   { bg: 'linear-gradient(135deg,#001a1a 0%,#134e4a 100%)', border: '#0d9488', label: 'Teal',   labelZh: '青翠綠' },
}
