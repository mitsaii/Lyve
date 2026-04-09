import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseLastDate } from '@/lib/utils'

/**
 * 自動更新演唱會狀態
 *
 * 規則：
 *  - 若 sale_start_at <= now()  AND status === 'pending'  → 更新為 'selling'
 *  - 若 date_str 的最後日期 < today AND status !== 'sold_out' → 更新為 'sold_out'
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

  // 2. 演唱會日期已過 → sold_out（使用 date_str 前10碼比較）
  //    date_str 格式: "2026/04/25–26" 或 "2026/04/25"
  //    取最後的日期：先取 – 後半，若無則取前半
  const { data: allActive, error: e2 } = await supabase
    .from('concerts')
    .select('id, artist, date_str, status')
    .neq('status', 'sold_out')

  if (e2) {
    results.push(`fetch active error: ${e2.message}`)
  } else {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const expiredIds: string[] = []

    for (const c of allActive ?? []) {
      try {
        const concertDate = parseLastDate(c.date_str as string)
        concertDate.setHours(23, 59, 59, 999)
        if (concertDate < today) {
          expiredIds.push(c.id)
        }
      } catch {
        // 忽略解析錯誤
      }
    }

    if (expiredIds.length > 0) {
      const { error: e3 } = await supabase
        .from('concerts')
        .update({ status: 'sold_out' })
        .in('id', expiredIds)

      if (e3) results.push(`expired→sold_out error: ${e3.message}`)
      else results.push(`expired→sold_out: ${expiredIds.length} updated`)
    } else {
      results.push('expired→sold_out: 0 updated')
    }
  }

  return NextResponse.json({ ok: true, results, ts: now.toISOString() })
}
