import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getRecentConcerts() {
  const { data } = await supabase
    .from('concerts')
    .select('artist, tour_zh, tour_en, date_str, city_zh, is_hot')
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('尚未設定 ANTHROPIC_API_KEY，請至 Vercel 環境變數新增')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API 錯誤 ${res.status}：${err}`)
  }

  const json = await res.json()
  return json.content?.[0]?.text ?? ''
}

async function generateAndPost() {
  try {
    const concerts = await getRecentConcerts()
    const hotConcerts = concerts.filter((c: { is_hot?: boolean }) => c.is_hot)
    const pool = hotConcerts.length > 0 ? hotConcerts : concerts
    const target = pool[Math.floor(Math.random() * pool.length)]

    const context = target
      ? `藝人：${target.artist}，巡演：${target.tour_zh || target.tour_en}，地點：${target.city_zh}，日期：${target.date_str}`
      : '台灣最新演唱會動態'

    const prompt = `你是台灣演唱會追星平台「Lyve」的官方編輯，請用繁體中文寫一篇追星貼文。

主題：${context}

格式（嚴格照以下輸出，不要加其他文字）：
標題：[15字以內的吸睛標題]

[100-150字的熱情內文，鼓勵粉絲、讚美藝人，可用 1-2 個 emoji]`

    const rawText = await callClaude(prompt)

    const lines = rawText.trim().split('\n')
    const titleLine = lines.find((l: string) => l.startsWith('標題：'))
    const title = titleLine
      ? titleLine.replace('標題：', '').trim()
      : `${target?.artist ?? 'Lyve'} 最新動態`

    const content = lines
      .filter((l: string) => !l.startsWith('標題：'))
      .join('\n')
      .trim()

    const { data: post, error } = await supabase
      .from('posts')
      .insert({ title, content, is_ai_generated: true })
      .select()
      .single()

    if (error) {
      console.error('[AI Post] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, title, id: post.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI 發文失敗'
    console.error('[AI Post]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST() {
  return generateAndPost()
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return generateAndPost()
}
