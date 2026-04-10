'use client'

import type { ReactElement } from 'react'

// 依照「categoryZh」自動選色 + 圖示
const CATEGORY_STYLES: Record<string, { gradient: string; icon: ReactElement }> = {
  'K-POP 專輯/周邊': {
    gradient: 'linear-gradient(135deg, #f472b6, #8b5cf6)',
    icon: (
      // vinyl record disc
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="8" cy="8" r="6.5" />
        <circle cx="8" cy="8" r="3.2" stroke="white" strokeWidth="1.3" />
        <circle cx="8" cy="8" r="0.9" fill="white" stroke="none" />
        <path d="M8 4.8 A3.2 3.2 0 0 1 11.2 8" strokeWidth="1.1" />
      </svg>
    ),
  },
  '唱片連鎖': {
    gradient: 'linear-gradient(135deg, #38bdf8, #6366f1)',
    icon: (
      // storefront
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 14V7.5L8 2L14 7.5V14" />
        <rect x="5.5" y="9.5" width="5" height="4.5" rx="0.8" />
        <rect x="3.5" y="7" width="2.5" height="2.2" rx="0.5" />
        <rect x="10" y="7" width="2.5" height="2.2" rx="0.5" />
      </svg>
    ),
  },
  '唱片行': {
    gradient: 'linear-gradient(135deg, #34d399, #0ea5e9)',
    icon: (
      // double music notes
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.5 4.5L10.5 3.2" />
        <line x1="5.5" y1="4.5" x2="5.5" y2="10.5" />
        <ellipse cx="4.3" cy="11.1" rx="1.8" ry="1.1" fill="white" stroke="none" transform="rotate(-15 4.3 11.1)" />
        <line x1="10.5" y1="3.2" x2="10.5" y2="9.2" />
        <ellipse cx="9.3" cy="9.8" rx="1.8" ry="1.1" fill="white" stroke="none" transform="rotate(-15 9.3 9.8)" />
      </svg>
    ),
  },
  '認證購買管道': {
    gradient: 'linear-gradient(135deg, #fbbf24, #f97316)',
    icon: (
      // shield with check
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5L13.5 4V9C13.5 12 8 14.5 8 14.5S2.5 12 2.5 9V4L8 1.5Z" />
        <path d="M5.5 8L7 9.8L10.5 6.5" strokeWidth="1.8" />
      </svg>
    ),
  },
  'K-POP 官方授權周邊': {
    gradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
    icon: (
      // star badge
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1.5L9.6 5.9H14.2L10.5 8.7L11.9 13.1L8 10.3L4.1 13.1L5.5 8.7L1.8 5.9H6.4Z" />
      </svg>
    ),
  },
  '日韓西洋專輯／周邊': {
    gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
    icon: (
      // headphones
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9V8a5 5 0 0 1 10 0v1" />
        <rect x="2" y="9" width="2.5" height="4" rx="1.2" />
        <rect x="11.5" y="9" width="2.5" height="4" rx="1.2" />
      </svg>
    ),
  },
  'K-POP 小卡專賣': {
    gradient: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    icon: (
      // photo card
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
        <circle cx="5.5" cy="7.5" r="1.8" />
        <path d="M9 6.5h3M9 8.5h2.5M9 10.5h2" />
      </svg>
    ),
  },
  '演唱會官方周邊': {
    gradient: 'linear-gradient(135deg, #f97316, #ef4444)',
    icon: (
      // ticket
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 6A1.5 1.5 0 0 0 3 4.5V3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v1A1.5 1.5 0 0 0 14.5 6v4A1.5 1.5 0 0 0 13 11.5v1a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1A1.5 1.5 0 0 0 1.5 10V6Z" />
        <line x1="6.5" y1="3" x2="6.5" y2="13" />
      </svg>
    ),
  },
  '官方明星周邊': {
    gradient: 'linear-gradient(135deg, #34d399, #10b981)',
    icon: (
      // microphone
      <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5.5" y="1.5" width="5" height="7" rx="2.5" />
        <path d="M3 8a5 5 0 0 0 10 0" />
        <line x1="8" y1="13" x2="8" y2="15" />
        <line x1="5.5" y1="15" x2="10.5" y2="15" />
      </svg>
    ),
  },
}

const DEFAULT_STYLE = {
  gradient: 'linear-gradient(135deg, #a78bfa, #6366f1)',
  icon: (
    <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3v7.5a2.5 2.5 0 1 1-1.5-2.3V4.8L6.5 6V12a2.5 2.5 0 1 1-1.5-2.3V5L11 3Z" />
    </svg>
  ),
}

interface SpotAvatarProps {
  categoryZh: string
  size?: 'sm' | 'md'
  className?: string
}

export function SpotAvatar({ categoryZh, size = 'sm', className = '' }: SpotAvatarProps) {
  const style = CATEGORY_STYLES[categoryZh] ?? DEFAULT_STYLE
  const sizeClass = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'

  return (
    <div
      className={`${sizeClass} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ background: style.gradient }}
    >
      {style.icon}
    </div>
  )
}
