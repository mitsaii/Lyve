'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { MyTicketsSection } from '@/components/tickets/MyTicketsSection'

export default function TicketsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/profile')
    }
  }, [user, authLoading, router])

  if (authLoading || !user) return null

  return (
    <div className="pb-24 min-h-screen">
      <div className="p-4">
        <MyTicketsSection />
      </div>
    </div>
  )
}
