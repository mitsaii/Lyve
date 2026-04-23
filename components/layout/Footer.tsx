'use client'

import Link from 'next/link'
import { useLang } from '@/contexts/LangContext'
import { useTheme } from '@/contexts/ThemeContext'

const SOCIALS = [
  {
    label: 'Threads',
    href: 'https://www.threads.com/@lyve__________?igshid=NTc4MTIwNjQ2YQ==',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.75-.375-1.36-.75-1.82-.513-.62-1.275-.936-2.27-.943h-.03c-.735 0-1.932.206-2.653 1.472l-1.773-1.017C8.478 5.58 10.004 4.99 11.979 4.99h.044c3.013.022 4.818 1.842 5.198 5.198.168.03.334.064.497.104 1.538.386 2.694 1.23 3.337 2.44.952 1.79.963 4.493-.815 6.229-1.678 1.643-3.81 2.351-6.918 2.374l-.136-.335Z" />
      </svg>
    ),
  },
]

/** 桃紅漸層 hover 效果 — inline handlers 讓純 CSS 難以做到的漸層文字 */
function GradientLink({
  href,
  children,
  external,
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  const baseStyle: React.CSSProperties = {
    color: 'var(--muted)',
    fontSize: '11px',
    textDecoration: 'none',
    transition: 'color 0.2s',
  }

  const applyGradient = (el: HTMLAnchorElement) => {
    el.style.background = 'linear-gradient(90deg, var(--accent), var(--accent2))'
    el.style.webkitBackgroundClip = 'text'
    el.style.backgroundClip = 'text'
    ;(el.style as unknown as Record<string, string>).webkitTextFillColor = 'transparent'
    el.style.color = 'transparent'
  }

  const removeGradient = (el: HTMLAnchorElement) => {
    el.style.background = ''
    el.style.webkitBackgroundClip = ''
    el.style.backgroundClip = ''
    ;(el.style as unknown as Record<string, string>).webkitTextFillColor = ''
    el.style.color = 'var(--muted)'
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={baseStyle}
        onMouseEnter={e => applyGradient(e.currentTarget)}
        onMouseLeave={e => removeGradient(e.currentTarget)}
      >
        {children}
      </a>
    )
  }

  return (
    <Link
      href={href}
      style={baseStyle}
      onMouseEnter={e => applyGradient(e.currentTarget as HTMLAnchorElement)}
      onMouseLeave={e => removeGradient(e.currentTarget as HTMLAnchorElement)}
    >
      {children}
    </Link>
  )
}

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
        paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
      }}
    >
      {/* 裝飾彩虹線 */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--accent), var(--accent2), var(--accent3), transparent)' }}
      />

      {/* 背景光暈 */}
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

      <div className="relative z-10 px-5 pt-7 pb-2 flex flex-col gap-5">
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

        {/* 連結列 */}
        <div className="flex items-center gap-4 flex-wrap">
          <GradientLink href="/about">
            {t('關於我們', 'About')}
          </GradientLink>
          <span style={{ color: 'var(--faint)', fontSize: '10px' }}>·</span>
          <GradientLink href="https://www.threads.com/@lyve__________?igshid=NTc4MTIwNjQ2YQ==" external>
            Threads
          </GradientLink>
        </div>

        {/* 分隔線 */}
        <div className="h-px w-full" style={{ background: 'var(--faint)' }} />

        {/* 底部：社群圖示 + Copyright + 版本號 */}
        <div className="flex items-center justify-between">
          {/* 社群媒體圖示 */}
          <div className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex items-center justify-center w-7 h-7 rounded-full transition-all"
                style={{ background: 'var(--faint)', color: 'var(--muted)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--accent)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--faint)'
                  e.currentTarget.style.color = 'var(--muted)'
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* Copyright + 版本號 */}
          <div className="flex flex-col items-end gap-0.5">
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
              © {new Date().getFullYear()} Lyve
              <span className="mx-1" style={{ color: 'var(--accent)' }}>♡</span>
              Taiwan
            </p>
            <p
              className="text-[9px] font-mono tracking-wider"
              style={{ color: 'var(--faint)', letterSpacing: '0.05em' }}
            >
              v0.1.0-alpha
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
