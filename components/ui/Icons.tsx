// 全站共用 SVG icon 元件（可愛時尚風格）

type P = { className?: string }

export const IconPin = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5C5.79 1.5 4 3.3 4 5.5c0 3.3 4 9 4 9s4-5.7 4-9c0-2.2-1.79-4-4-4z" />
    <circle cx="8" cy="5.5" r="1.5" />
  </svg>
)

export const IconCalendar = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="11" rx="2" />
    <path d="M10 1.5v3M6 1.5v3M2 7h12" />
    <circle cx="5.5" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="8" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
  </svg>
)

export const IconTag = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1.5H14.5V7L7 14.5L1.5 9L9 1.5Z" />
    <circle cx="11.5" cy="4.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
)

export const IconVenue = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 14V6.5L8 2L14 6.5V14" />
    <rect x="6" y="10" width="4" height="4" rx="0.5" />
    <rect x="4" y="7" width="2" height="2" rx="0.5" />
    <rect x="10" y="7" width="2" height="2" rx="0.5" />
  </svg>
)

export const IconTicket = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 10.5V13.5H14.5V10.5C13.4 10.5 12.5 9.6 12.5 8.5C12.5 7.4 13.4 6.5 14.5 6.5V3.5H1.5V6.5C2.6 6.5 3.5 7.4 3.5 8.5C3.5 9.6 2.6 10.5 1.5 10.5Z" />
    <path d="M6 8.5h4" strokeDasharray="1.5 1" />
  </svg>
)

export const IconClock = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 4.5V8L10.5 10" />
  </svg>
)

export const IconHeart = ({ filled, className = 'w-4.5 h-4.5' }: P & { filled?: boolean }) => (
  <svg viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 17.5C10 17.5 2 12 2 6.5A4.5 4.5 0 0 1 10 3.72 4.5 4.5 0 0 1 18 6.5C18 12 10 17.5 10 17.5Z" />
  </svg>
)

export const IconBell = ({ filled, slash, className = 'w-4.5 h-4.5' }: P & { filled?: boolean; slash?: boolean }) => (
  <svg viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 8A5 5 0 0 0 5 8c0 5.83-2.5 7.5-2.5 7.5H17.5S15 13.83 15 8" />
    <path d="M11.44 17.5a2 2 0 0 1-2.88 0" />
    {slash && <path d="M3 3L17 17" />}
  </svg>
)

export const IconGlobe = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 1.5C8 1.5 5.5 4.5 5.5 8S8 14.5 8 14.5 10.5 11.5 10.5 8 8 1.5 8 1.5z" />
    <path d="M1.5 8h13" />
  </svg>
)

export const IconSun = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.8" />
    <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" />
  </svg>
)

export const IconMoon = ({ className = 'w-3.5 h-3.5' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 8.7A6 6 0 1 1 7.3 3 4.3 4.3 0 0 0 13 8.7z" />
  </svg>
)

export const IconSearch = ({ className = 'w-5 h-5' }: P) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="6" />
    <path d="M13.5 13.5L17.5 17.5" />
  </svg>
)

export const IconStar = ({ className = 'w-4 h-4' }: P) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="M8 1.2l1.7 3.9 4.2.6-3 3 .7 4.1L8 10.7l-3.6 2.1.7-4.1-3-3 4.2-.6z" />
  </svg>
)

export const IconMusic = ({ className = 'w-4 h-4' }: P) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 13V4.5l7-1.5v9.5" />
    <circle cx="4.5" cy="13" r="1.5" />
    <circle cx="11.5" cy="12.5" r="1.5" />
  </svg>
)

export const IconSparkle = ({ className = 'w-4 h-4' }: P) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="M8 1l.9 4.1L13 8l-4.1.9L8 13l-.9-4.1L3 8l4.1-.9z" />
    <circle cx="13" cy="3" r="1" />
    <circle cx="3" cy="13" r="0.7" />
  </svg>
)
