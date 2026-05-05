import { NextRequest, NextResponse } from 'next/server'
import { scrapeTicketSaleTime } from '@/lib/scrapeTicketTime'

/**
 * GET /api/scrape-sale-time?url=<票務平台網址>
 *
 * 從指定票務平台頁面抓取開賣時間。
 * 回傳：{ sale_start_at: string | null, source: string }
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // 基本 URL 驗證
  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const result = await scrapeTicketSaleTime(url)
  return NextResponse.json(result)
}
