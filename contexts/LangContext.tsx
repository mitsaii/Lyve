'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Lang } from '@/types/concert'

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (zh: string, en: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (zh) => zh,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved) {
      setLang(saved)
    }
  }, [])

  const changeLang = (l: Lang) => {
    setLang(l)
    localStorage.setItem('lang', l)
  }

  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en)

  return (
    <LangContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
