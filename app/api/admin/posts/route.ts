import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'mitsai0701@gmail.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyAdmin(): Promise<boolean> {
  try {
    const ssr = await createServerClient()
    const { data: { user } } = await ssr.auth.getUser()
    return !!user?.email && user.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

// POST /api/admin/posts — 手動新增貼文（service_role 寫入，繞過 RLS）
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, content, image_url } = body

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '標題與內文不能為空' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: title.trim(),
      content: content.trim(),
      image_url: image_url?.trim() || null,
      is_ai_generated: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, post: data })
}

// DELETE /api/admin/posts — 刪除貼文
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: '缺少貼文 id' }, { status: 400 })
  }

  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
