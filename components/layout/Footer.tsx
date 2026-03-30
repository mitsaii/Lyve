'use client'

import { useLang } from '@/contexts/LangContext'
import { useTheme } from '@/contexts/ThemeContext'

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: 'X / Twitter',
    href: 'https://x.com/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
]

export function Footer() {
  const { t } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <footer
      className="relative w-full overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(170deg, #0c0c12 0%, #16101e 100%)'
          : 'linear-gradient(170deg, #fff5f7 0%, #f0eeff 100%)',
        borderTop: `1px solid var(--faint)`,
        paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
      }}
    >
      {/* 裝飾波浪頂部 */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent3), transparent)' }} />

      {/* 背景裝飾圓點 */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden>
        {[
          { top: '18%', left: '8%', size: 48, color: 'var(--accent)', opacity: isDark ? 0.07 : 0.06 },
          { top: '55%', left: '75%', size: 64, color: 'var(--accent2)', opacity: isDark ? 0.06 : 0.05 },
          { top: '80%', left: '35%', size: 36, color: 'var(--accent3)', opacity: isDark ? 0.07 : 0.05 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              background: dot.color,
              opacity: dot.opacity,
              filter: 'blur(18px)',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 px-5 pt-7 pb-2 flex flex-col gap-6">
        {/* 品牌區 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className="text-xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Lyve ✦
            </span>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t('台灣演唱會資訊平台', 'Taiwan Concert Info Platform')}
            <br />
            {t('即時掌握最新演出∙搶先預訂', 'Real-time concert updates & bookings')}
          </p>
        </div>

        {/* 分隔線 */}
        <div className="h-px w-full" style={{ background: 'var(--faint)' }} />

        {/* 底部：社群 + Copyright */}
        <div className="flex items-center justify-between">
          {/* 社群媒體 */}
          <div className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
                style={{
                  background: 'var(--faint)',
                  color: 'var(--muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--faint)'
                  e.currentTarget.style.color = 'var(--muted)'
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
            © {new Date().getFullYear()} Lyve
            <span className="mx-1" style={{ color: 'var(--accent)' }}>♡</span>
            Taiwan
          </p>
        </div>
      </div>
    </footer>
  )
}
