import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

// 儲存/刪除 Web Push 訂閱
export async function POST(req: NextRequest) {
  try {
    // 必須登入才能訂閱／退訂（避免匿名濫發、亂刪別人的訂閱）
    const ssr = await createServerClient()
    const { data: { user } } = await ssr.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscription, concertId, action } = await req.json()

    if (!subscription?.endpoint || !concertId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (action === 'unsubscribe') {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('concert_id', concertId)
        .eq('endpoint', subscription.endpoint)
      return NextResponse.json({ ok: true })
    }

    // upsert：同一 endpoint + concert_id 不重複
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        concert_id: concertId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }, { onConflict: 'concert_id,endpoint' })

    if (error) {
      console.error('push_subscriptions upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('subscribe route error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
