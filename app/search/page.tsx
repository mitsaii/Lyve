import { Metadata } from 'next'
import SearchPageClient from './SearchPageClient'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `搜尋「${q}」` : '搜尋演唱會',
    description: q
      ? `搜尋「${q}」的台灣演唱會結果`
      : '搜尋台灣演唱會 — 找尋你喜愛的歌手、場地與城市',
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  return <SearchPageClient initialQuery={q ?? ''} />
}
