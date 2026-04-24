-- ============================================================
-- 動態功能：貼文 + 留言 + 愛心
-- ============================================================

-- 1. 貼文表（只有平台/admin 可以新增）
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  content       text not null,
  image_url     text,
  artist        text,               -- 關聯藝人（可選）
  concert_id    uuid references concerts(id) on delete set null,
  tags          text[] default '{}',
  likes_count   int not null default 0,
  comments_count int not null default 0,
  is_ai_generated boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. 留言表（登入用戶皆可留言）
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null check (char_length(content) <= 500),
  likes_count int not null default 0,
  created_at  timestamptz not null default now()
);

-- 3. 貼文愛心（每位用戶每篇只能一次）
create table if not exists post_likes (
  post_id   uuid not null references posts(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 4. 留言愛心
create table if not exists comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_posts_created_at on posts(created_at desc);
create index if not exists idx_comments_post_id on comments(post_id, created_at asc);
create index if not exists idx_post_likes_post_id on post_likes(post_id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_likes enable row level security;
alter table comment_likes enable row level security;

-- Posts: 所有人可讀，只有 service_role（後端/AI）可寫
create policy "posts_read_all" on posts for select using (true);
create policy "posts_insert_service" on posts for insert with check (auth.role() = 'service_role');
create policy "posts_update_service" on posts for update using (auth.role() = 'service_role');

-- Comments: 所有人可讀，登入用戶可新增自己的留言，可刪除自己的
create policy "comments_read_all" on comments for select using (true);
create policy "comments_insert_auth" on comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own" on comments for delete using (auth.uid() = user_id);

-- Post likes: 登入用戶操作自己的
create policy "post_likes_read_all" on post_likes for select using (true);
create policy "post_likes_insert_auth" on post_likes for insert with check (auth.uid() = user_id);
create policy "post_likes_delete_own" on post_likes for delete using (auth.uid() = user_id);

-- Comment likes: 同上
create policy "comment_likes_read_all" on comment_likes for select using (true);
create policy "comment_likes_insert_auth" on comment_likes for insert with check (auth.uid() = user_id);
create policy "comment_likes_delete_own" on comment_likes for delete using (auth.uid() = user_id);

-- ============================================================
-- Functions：更新 likes_count / comments_count（用 trigger）
-- ============================================================
create or replace function update_post_likes_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update posts set likes_count = greatest(likes_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create or replace trigger trg_post_likes_count
after insert or delete on post_likes
for each row execute function update_post_likes_count();

create or replace function update_comments_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update posts set comments_count = comments_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update posts set comments_count = greatest(comments_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

create or replace trigger trg_comments_count
after insert or delete on comments
for each row execute function update_comments_count();

-- ============================================================
-- 示範資料（可選）
-- ============================================================
-- insert into posts (title, content, artist, tags, is_ai_generated) values
-- ('BLACKPINK 台北站開賣！', '今天 BLACKPINK 台北巡演正式開搶...', 'BLACKPINK', array['kpop','blackpink'], false);
