'use client'

import { useEffect, useState } from 'react'
import SplashScreen from './SplashScreen'

/**
 * 首次載入時顯示 2 秒 splash 動畫，之後 session 內不再顯示。
 * 包在整個 app 外層，splash 是 fixed z-9999 所以不會影響 children 佈局。
 */
export default function SplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // 只在首次開啟網站時顯示（同一個 session 重新整理不重複顯示）
    try {
      const seen = sessionStorage.getItem('lyve_splash_seen')
      if (!seen) {
        setShowSplash(true)
        sessionStorage.setItem('lyve_splash_seen', '1')
      }
    } catch {
      // sessionStorage 不可用時直接顯示一次
      setShowSplash(true)
    }
    setChecked(true)
  }, [])

  return (
    <>
      {children}
      {checked && showSplash && (
        <SplashScreen duration={2200} onComplete={() => setShowSplash(false)} />
      )}
    </>
  )
}
