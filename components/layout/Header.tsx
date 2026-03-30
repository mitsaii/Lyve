'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { useLang } from '@/contexts/LangContext'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useLang()
  const pathname = usePathname()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  const isHomePage = pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < 10) {
        // 在頂部時始終顯示
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY) {
        // 向下滾動時隱藏
        setIsVisible(false)
      } else {
        // 向上滾動時顯示
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between backdrop-blur-md transition-transform duration-300"
      style={{ 
        background: 'var(--header-bg)',
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)'
      }}
    >
      <div className="flex items-center gap-3">
        {!isHomePage && (
          <button
            onClick={() => router.back()}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            style={{ background: 'var(--faint)', color: 'var(--text)' }}
          >
            ← {t('返回', 'Back')}
          </button>
        )}
        <button onClick={() => router.push('/')} className="flex items-center">
          <Image 
            src={theme === 'dark' ? '/lyve-logo-dark.png' : '/lyve-logo.png'}
            alt="Lyve" 
            width={200} 
            height={80}
            className="object-contain cursor-pointer hover:opacity-80 transition-opacity"
            style={{ 
              mixBlendMode: theme === 'dark' ? 'normal' : 'multiply'
            }}
            priority
          />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          style={{ background: 'var(--faint)', color: 'var(--text)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 mr-1 inline-block" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 1.5C8 1.5 5.5 4.5 5.5 8S8 14.5 8 14.5 10.5 11.5 10.5 8 8 1.5 8 1.5z" />
            <path d="M1.5 8h13" />
          </svg>
          {lang === 'zh' ? 'EN' : '中'}
        </button>

        <button
          onClick={toggleTheme}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1"
          style={{ background: 'var(--faint)', color: 'var(--text)' }}
        >
          {theme === 'dark' ? (
            <>
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="2.8" />
                <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" />
              </svg>
              {t('白天', 'Light')}
            </>
          ) : (
            <>
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 8.7A6 6 0 1 1 7.3 3 4.3 4.3 0 0 0 13 8.7z" />
              </svg>
              {t('黑夜', 'Dark')}
            </>
          )}
        </button>
      </div>
    </header>
  )
}
