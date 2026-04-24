import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用 service_role 寫入（繞過 RLS）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 從 Supabase 抓最近的演唱會資訊作為 AI 的素材
async function getRecentConcerts() {
  const { data } = await supabase
    .from('concerts')
    .select('artist, tour_zh, tour_en, date_str, city_zh, genre, is_hot')
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

// 透過原生 fetch 呼叫 Anthropic API
async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error: ${res.status} ${err}`)
  }

  const json = await res.json()
  return json.content?.[0]?.text ?? ''
}

async function generateAndPost() {
  try {
    // 取得近期演唱會資料
    const concerts = await getRecentConcerts()

    // 隨機選一個熱門或近期的演唱會作為主題
    const hotConcerts = concerts.filter((c: { is_hot?: boolean }) => c.is_hot)
    const concertPool = hotConcerts.length > 0 ? hotConcerts : concerts
    const targetConcert = concertPool[Math.floor(Math.random() * concertPool.length)]

    // 如果沒有演唱會資料，用通用主題
    const concertContext = targetConcert
      ? `藝人：${targetConcert.artist}，巡演：${targetConcert.tour_zh || targetConcert.tour_en}，地點：${targetConcert.city_zh}，日期：${targetConcert.date_str}`
      : '台灣最新演唱會動態'

    const prompt = `你是一個台灣演唱會追星平台「Lyve」的官方編輯。請用繁體中文，以熱情的追星語氣撰寫一篇短貼文。

主題：${concertContext}

要求：
- 標題：15字以內，吸睛有趣（請在第一行寫「標題：XXX」）
- 內文：100-200字，包含：對藝人的讚美、對演唱會的期待、鼓勵粉絲購票或支持
- 語氣：熱情、正向、像粉絲寫的但更有條理
- 可以用 1-2 個 emoji 點綴，但不要過多
- 最後列出 2-4 個 hashtag（例如 #BLACKPINK #台北演唱會）

請直接輸出，不要有任何說明。格式嚴格依照：
標題：[標題內容]
[空一行]
[內文]
[空一行]
#tag1 #tag2 #tag3`

    const rawText = await callClaude(prompt)

    // 解析輸出
    const lines = rawText.trim().split('\n')
    const titleLine = lines.find((l: string) => l.startsWith('標題：'))
    const title = titleLine ? titleLine.replace('標題：', '').trim() : `${targetConcert?.artist ?? 'Lyve'} 最新動態`

    // 取 hashtags
    const tagLine = lines.filter((l: string) => l.trim().startsWith('#')).join(' ')
    const tags = tagLine.match(/#[\w\u4e00-\u9fff]+/g)?.map((t: string) => t.slice(1)) ?? []

    // 內文（去掉標題行和 tag 行）
    const contentLines = lines.filter(
      (l: string) => !l.startsWith('標題：') && !l.trim().startsWith('#')
    )
    const content = contentLines.join('\n').trim()

    // 寫入 Supabase
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        artist: targetConcert?.artist ?? null,
        tags,
        is_ai_generated: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[AI Post] Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, title, id: post.id })
  } catch (err) {
    console.error('[AI Post] Error:', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}

export async function POST() {
  return generateAndPost()
}

// GET：用於 cron job 定期呼叫
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return generateAndPost()
}
