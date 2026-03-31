import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Concert } from '@/types/concert'
import ConcertDetailClient from './ConcertDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

async function getConcert(id: string): Promise<Concert | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('concerts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Concert
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const concert = await getConcert(id)

  if (!concert) {
    return { title: '演唱會不存在 | Lyve' }
  }

  const title = `${concert.artist} ${concert.tour_zh} | Lyve`
  const description = `${concert.city_zh} · ${concert.venue_zh} · ${concert.date_str} · ${concert.price_zh}`
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lyve-alpha.vercel.app'
  const url = `${siteUrl}/concert/${concert.id}`
  const image = concert.image_url ?? `${siteUrl}/og-default.png`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Lyve',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: 'zh_TW',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  }
}

export default async function ConcertDetailPage({ params }: Props) {
  const { id } = await params
  const concert = await getConcert(id)

  if (!concert) notFound()

  return <ConcertDetailClient concert={concert} />
}
