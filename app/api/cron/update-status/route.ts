import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseLastDate } from '@/lib/utils'

/**
 * 自動更新演唱會狀態
 *
 * 規則：
 *  - 若 sale_start_at <= now()  AND status === 'pending'   → 更新為 'selling'
 *  - 若 date_str 的最後日期 < today AND status !== 'ended' → 更新為 'ended'
 *
 * 由 Vercel Cron Job（每小時執行一次）觸發。
 */
export async function GET(req: NextRequest) {
  // 驗證 Cron Secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const results: string[] = []

  // 1. pending → selling: sale_start_at 已過
  const { data: toSelling, error: e1 } = await supabase
    .from('concerts')
    .update({ status: 'selling' })
    .eq('status', 'pending')
    .lte('sale_start_at', now.toISOString())
    .not('sale_start_at', 'is', null)
    .select('id, artist')

  if (e1) results.push(`pending→selling error: ${e1.message}`)
  else results.push(`pending→selling: ${toSelling?.length ?? 0} updated`)

  // 2. 演唱會日期已過 → ended（使用 date_str 最後日期比較）
  //    date_str 格式: "2026/04/25–26" 或 "2026/04/25"
  //    free 是手動標記（免費活動），不應被自動覆蓋
  const { data: allActive, error: e2 } = await supabase
    .from('concerts')
    .select('id, artist, date_str, status')
    .not('status', 'eq', 'ended')

  if (e2) {
    results.push(`fetch active error: ${e2.message}`)
  } else {
    // 用 Asia/Taipei 算「今日 0 點」，避免 Vercel UTC 與台灣 8 小時時差導致演唱會晚 8 小時才被標 ended
    const taipeiTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) // YYYY-MM-DD
    const today = new Date(`${taipeiTodayStr}T00:00:00+08:00`)

    const expiredIds: string[] = []

    for (const c of allActive ?? []) {
      try {
        // parseLastDate 已回傳 Taipei 0 點，直接與 today 比較
        const concertEndDay = parseLastDate(c.date_str as string)
        if (Number.isNaN(concertEndDay.getTime())) continue
        // today 已超過演唱會末日 → ended
        if (today.getTime() > concertEndDay.getTime()) {
          expiredIds.push(c.id)
        }
      } catch {
        // 忽略解析錯誤
      }
    }

    if (expiredIds.length > 0) {
      const { error: e3 } = await supabase
        .from('concerts')
        .update({ status: 'ended' })
        .in('id', expiredIds)

      if (e3) results.push(`expired→ended error: ${e3.message}`)
      else results.push(`expired→ended: ${expiredIds.length} updated`)
    } else {
      results.push('expired→ended: 0 updated')
    }
  }

  return NextResponse.json({ ok: true, results, ts: now.toISOString() })
}
