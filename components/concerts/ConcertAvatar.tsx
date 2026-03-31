'use client'

import { Genre } from '@/types/concert'

interface ConcertAvatarProps {
  genre: Genre
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const GENRE_STYLES: Record<string, { gradient: string; label: string }> = {
  kpop:    { gradient: 'linear-gradient(135deg, #f472b6, #8b5cf6)', label: 'K-Pop' },
  cpop:    { gradient: 'linear-gradient(135deg, #38bdf8, #6366f1)', label: 'C-Pop' },
  rock:    { gradient: 'linear-gradient(135deg, #f97316, #dc2626)', label: 'Rock'  },
  jpop:    { gradient: 'linear-gradient(135deg, #fb7185, #e879f9)', label: 'J-Pop' },
  western: { gradient: 'linear-gradient(135deg, #fbbf24, #f97316)', label: 'Western' },
  festival:{ gradient: 'linear-gradient(135deg, #34d399, #0891b2)', label: 'Festival' },
  all:     { gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', label: 'Music' },
}

const DEFAULT_STYLE = { gradient: 'linear-gradient(135deg, #a78bfa, #6366f1)', label: 'Music' }

function GenreIcon({ genre }: { genre: string }) {
  const shared = {
    viewBox: '0 0 16 16' as const,
    fill: 'none' as const,
    className: 'w-5 h-5',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (genre) {
    // 4-pointed sparkle star ✦
    case 'kpop':
      return (
        <svg {...shared} fill="white" stroke="none">
          <path d="M8 1.5L9.35 6.65L14.5 8L9.35 9.35L8 14.5L6.65 9.35L1.5 8L6.65 6.65Z" />
          <circle cx="12.5" cy="3" r="0.9" />
          <circle cx="3.5" cy="12.5" r="0.65" />
        </svg>
      )

    // Double 8th music notes ♫
    case 'cpop':
      return (
        <svg {...shared} stroke="white" strokeWidth="1.7">
          {/* beam */}
          <path d="M5.5 4.5L10.5 3.2" />
          {/* left stem + head */}
          <line x1="5.5" y1="4.5" x2="5.5" y2="10.5" />
          <ellipse cx="4.3" cy="11.1" rx="1.8" ry="1.1" fill="white" stroke="none" transform="rotate(-15 4.3 11.1)" />
          {/* right stem + head */}
          <line x1="10.5" y1="3.2" x2="10.5" y2="9.2" />
          <ellipse cx="9.3" cy="9.8" rx="1.8" ry="1.1" fill="white" stroke="none" transform="rotate(-15 9.3 9.8)" />
        </svg>
      )

    // Lightning bolt ⚡
    case 'rock':
      return (
        <svg {...shared} fill="white" stroke="none">
          <path d="M10 1.5L4.5 9.5H8L6 14.5L12 7.5H8.5L10 1.5Z" />
        </svg>
      )

    // Cherry blossom 🌸
    case 'jpop':
      return (
        <svg {...shared} fill="white" stroke="none">
          <ellipse cx="8" cy="4" rx="1.6" ry="2.6" />
          <ellipse cx="8" cy="12" rx="1.6" ry="2.6" />
          <ellipse cx="4" cy="8" rx="2.6" ry="1.6" />
          <ellipse cx="12" cy="8" rx="2.6" ry="1.6" />
          <ellipse cx="5.2" cy="5.2" rx="1.6" ry="2.6" transform="rotate(45 5.2 5.2)" />
          <ellipse cx="10.8" cy="10.8" rx="1.6" ry="2.6" transform="rotate(45 10.8 10.8)" />
          <ellipse cx="10.8" cy="5.2" rx="1.6" ry="2.6" transform="rotate(-45 10.8 5.2)" />
          <ellipse cx="5.2" cy="10.8" rx="1.6" ry="2.6" transform="rotate(-45 5.2 10.8)" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      )

    // Microphone 🎤
    case 'western':
      return (
        <svg {...shared} stroke="white" strokeWidth="1.7">
          <rect x="5.5" y="2" width="5" height="6.5" rx="2.5" />
          <path d="M3.5 8C3.5 10.49 5.51 12.5 8 12.5C10.49 12.5 12.5 10.49 12.5 8" />
          <line x1="8" y1="12.5" x2="8" y2="14.5" />
          <line x1="5.5" y1="14.5" x2="10.5" y2="14.5" />
        </svg>
      )

    // Festival tent ⛺
    case 'festival':
      return (
        <svg {...shared} stroke="white" strokeWidth="1.7">
          <path d="M1.5 14L8 2.5L14.5 14Z" />
          <path d="M5.5 14V11L8 8.5L10.5 11V14" />
          <line x1="8" y1="2.5" x2="8" y2="8.5" />
        </svg>
      )

    // Default: single music note ♩
    default:
      return (
        <svg {...shared} stroke="white" strokeWidth="1.7">
          <path d="M11 3v7.5a2.5 2.5 0 1 1-1.5-2.3V4.8L6.5 6V12a2.5 2.5 0 1 1-1.5-2.3V5L11 3Z" />
        </svg>
      )
  }
}

export function ConcertAvatar({ genre, size = 'md', className = '' }: ConcertAvatarProps) {
  const style = GENRE_STYLES[genre] ?? DEFAULT_STYLE
  const sizeClass = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11'

  return (
    <div
      className={`${sizeClass} rounded-2xl flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ background: style.gradient }}
      aria-label={style.label}
    >
      <GenreIcon genre={genre} />
    </div>
  )
}
