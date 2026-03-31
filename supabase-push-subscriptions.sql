-- ================================================================
-- Web Push 訂閱資料表
-- 在 Supabase Dashboard > SQL Editor 執行此腳本
-- ================================================================

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  concert_id  text not null,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now(),
  -- 同一 endpoint 只能訂閱同一場演唱會一次
  unique (concert_id, endpoint)
);

-- RLS：只允許 service_role 讀寫（API route 使用 service_role）
alter table push_subscriptions enable row level security;

-- 允許任何人新增（前端 subscribe）
create policy "allow_insert" on push_subscriptions
  for insert with check (true);

-- 只有 service_role 可以查詢（避免洩漏 endpoint）
create policy "service_role_select" on push_subscriptions
  for select using (auth.role() = 'service_role');

create policy "service_role_delete" on push_subscriptions
  for delete using (auth.role() = 'service_role');
