import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Vercel Cron 每分鐘觸發此 route，發送開賣前 10 分鐘的推播
export async function GET(req: NextRequest) {
  // 驗證 cron secret，防止外部隨意呼叫
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  // 搜尋 sale_start_at 在接下來 8~12 分鐘內的演唱會（±2min 容許誤差）
  const from = new Date(now.getTime() + 8 * 60 * 1000).toISOString()
  const to   = new Date(now.getTime() + 12 * 60 * 1000).toISOString()

  const { data: concerts, error: cErr } = await supabase
    .from('concerts')
    .select('id, artist, tour_zh, city_zh, sale_start_at')
    .eq('status', 'pending')
    .gte('sale_start_at', from)
    .lte('sale_start_at', to)

  if (cErr || !concerts || concerts.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let totalSent = 0
  let totalFailed = 0

  for (const concert of concerts) {
    // 查詢所有訂閱此演唱會的訂閱
    const { data: subs, error: sErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, id')
      .eq('concert_id', concert.id)

    if (sErr || !subs) continue

    const payload = JSON.stringify({
      title: '🎤 搶票提醒',
      body: `「${concert.artist}」${concert.city_zh}場 10 分鐘後開賣，準備好搶票！`,
      tag: `alert-${concert.id}`,
      url: '/alerts',
    })

    const deadEndpoints: string[] = []

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 600 }
          )
          totalSent++
        } catch (e: unknown) {
          const err = e as { statusCode?: number }
          // 410 Gone = 訂閱已失效，刪除
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            deadEndpoints.push(sub.endpoint)
          }
          totalFailed++
        }
      })
    )

    // 清理失效訂閱
    if (deadEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', deadEndpoints)
        .eq('concert_id', concert.id)
    }
  }

  console.log(`[push/trigger] sent=${totalSent} failed=${totalFailed}`)
  return NextResponse.json({ sent: totalSent, failed: totalFailed })
}
