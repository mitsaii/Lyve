'use client'

import { useState } from 'react'
import SplashScreen from './SplashScreen'

/**
 * 每次載入/重整都顯示 2 秒 splash 動畫。
 * 包在整個 app 外層，splash 是 fixed z-9999 所以不會影響 children 佈局。
 */
export default function SplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <>
      {children}
      {showSplash && (
        <SplashScreen duration={2200} onComplete={() => setShowSplash(false)} />
      )}
    </>
  )
}
