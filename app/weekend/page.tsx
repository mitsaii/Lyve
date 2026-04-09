import { Metadata } from 'next'
import { WeekendSpotsSection } from '@/components/home/WeekendSpotsSection'

export const metadata: Metadata = {
  title: '周邊資訊',
  description: '演唱會周邊商品、紀念品與相關資訊店',
}

export default function WeekendPage() {
  return (
    <div className="py-4 pb-24 min-h-screen">
      <WeekendSpotsSection />
    </div>
  )
}
