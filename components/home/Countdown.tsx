'use client'

import { useState, useEffect } from 'react'
import { calcCountdown } from '@/lib/utils'
import { useLang } from '@/contexts/LangContext'

interface CountdownProps {
  targetDate: string
}

export function Countdown({ targetDate }: CountdownProps) {
  const { t } = useLang()
  const [timeLeft, setTimeLeft] = useState(calcCountdown(targetDate))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calcCountdown(targetDate))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <div 
      className="p-6 rounded-2xl text-center"
      style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center justify-center gap-3 font-mono">
        {[
          { value: timeLeft.days, label: t('天', 'D') },
          { value: timeLeft.hours, label: t('時', 'H') },
          { value: timeLeft.minutes, label: t('分', 'M') },
          { value: timeLeft.seconds, label: t('秒', 'S') },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
              style={{ background: 'var(--faint)', color: 'var(--accent)' }}
            >
              {String(item.value).padStart(2, '0')}
            </div>
            <span className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
