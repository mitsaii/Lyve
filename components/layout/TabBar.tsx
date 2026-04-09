'use client'

import { useLang } from '@/contexts/LangContext'
import { useSaved } from '@/contexts/SavedContext'
import { useAlert } from '@/contexts/AlertContext'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const IconHome = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12L12 3l9 9" />
    <path d="M9 21V12h6v9" />
    <path d="M5 10v11h14V10" />
  </svg>
)

const IconNearby = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={active ? 'var(--accent)' : 'none'} />
    <circle cx="12" cy="9" r="2.5" fill={active ? '#fff' : 'none'} stroke={active ? 'none' : 'currentColor'} strokeWidth={1.6} />
  </svg>
)

const IconCalendar = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const IconBell = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    {active && <circle cx="18" cy="5" r="3" fill="var(--accent)" stroke="none" />}
  </svg>
)

const IconPerson = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" fill={active ? 'var(--accent)' : 'none'} stroke={active ? 'none' : 'currentColor'} />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

export function TabBar() {
  const { t } = useLang()
  const { savedIds } = useSaved()
  const { alertIds } = useAlert()
  const { user } = useAuth()
  const pathname = usePathname()

  const tabs = [
    { key: 'home', path: '/', label: t('首頁', 'Home'), Icon: IconHome },
    { key: 'weekend', path: '/weekend', label: t('周邊', 'Nearby'), Icon: IconNearby },
    { key: 'calendar', path: '/calendar', label: t('月曆', 'Calendar'), Icon: IconCalendar },
    { key: 'alerts', path: '/alerts', label: t('提醒', 'Alerts'), Icon: IconBell },
    { key: 'profile', path: '/profile', label: t('個人', 'Profile'), Icon: IconPerson },
  ]

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-1 backdrop-blur-md"
      style={{ 
        background: 'var(--nav-bg)', 
        borderTop: '1px solid var(--faint)',
        maxWidth: '480px',
        margin: '0 auto',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.35rem)'
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.path
        return (
          <Link
            key={tab.key}
            href={tab.path}
            className="relative flex flex-col items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-xs font-medium transition-all"
            style={{
              color: isActive ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            <tab.Icon active={isActive} />
            <span className="text-[9px]">{tab.label}</span>
            {tab.key === 'profile' && user && savedIds.size > 0 && (
              <span 
                className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'var(--accent2)', color: '#000' }}
              >
                {savedIds.size}
              </span>
            )}
            {tab.key === 'alerts' && alertIds.size > 0 && (
              <span 
                className="absolute -top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {alertIds.size}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
