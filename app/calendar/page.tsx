'use client'

import { useState, useEffect } from 'react'
import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { ConcertCard } from '@/components/concerts/ConcertCard'
import { ConcertModal } from '@/components/concerts/ConcertModal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { IconCalendar } from '@/components/ui/Icons'
import { createClient } from '@/lib/supabase/client'

export default function CalendarPage() {
  const { t } = useLang()
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  useEffect(() => {
    fetchConcerts()
  }, [])

  const fetchConcerts = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('concerts')
      .select('*')
      .order('date_str', { ascending: true })

    if (!error && data) {
      setConcerts(data as Concert[])
    }
  }

  // 分組演出 (依月份)
  const groupedConcerts: Record<string, Concert[]> = {}
  concerts.forEach((concert) => {
    const month = concert.date_str.substring(0, 7) // YYYY-MM
    if (!groupedConcerts[month]) {
      groupedConcerts[month] = []
    }
    groupedConcerts[month].push(concert)
  })

  const months = Object.keys(groupedConcerts).sort()
  const displayedMonths = selectedMonth === 'all' ? months : [selectedMonth]

  return (
    <>
      <div className="pb-24 min-h-screen">
        <div className="p-4">
          <SectionLabel icon={<IconCalendar className="w-4 h-4" />} text={t('演出日曆', 'Concert Calendar')} />

          {/* 月份篩選 */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
            <button
              onClick={() => setSelectedMonth('all')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedMonth === 'all' ? 'font-bold' : ''
              }`}
              style={{
                background: selectedMonth === 'all' ? 'var(--accent)' : 'var(--faint)',
                color: selectedMonth === 'all' ? '#fff' : 'var(--text)',
              }}
            >
              {t('全部', 'All')}
            </button>
            {months.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedMonth === month ? 'font-bold' : ''
                }`}
                style={{
                  background: selectedMonth === month ? 'var(--accent)' : 'var(--faint)',
                  color: selectedMonth === month ? '#fff' : 'var(--text)',
                }}
              >
                {month}
              </button>
            ))}
          </div>

          {/* 演出列表 (分月顯示) */}
          <div className="space-y-8">
            {displayedMonths.map((month) => (
              <div key={month}>
                <div className="text-sm font-bold mb-3 px-2" style={{ color: 'var(--accent)' }}>
                  {month}
                </div>
                <div className="space-y-3">
                  {groupedConcerts[month].map((concert) => (
                    <ConcertCard
                      key={concert.id}
                      concert={concert}
                      onClick={() => setSelectedConcert(concert)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {concerts.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              {t('暫無演出', 'No concerts found')}
            </div>
          )}
        </div>
      </div>

      <ConcertModal concert={selectedConcert} onClose={() => setSelectedConcert(null)} />
    </>
  )
}
