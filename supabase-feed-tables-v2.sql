-- ============================================================
-- 動態功能 v2（先刪舊 policy 再建，避免重複錯誤）
-- ============================================================

-- 1. 建立資料表
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  content       text not null,
  image_url     text,
  artist        text,
  concert_id    uuid,
  tags          text[] default '{}',
  likes_count   int not null default 0,
  comments_count int not null default 0,
  is_ai_generated boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null check (char_length(content) <= 500),
  likes_count int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists post_likes (
  post_id   uuid not null references posts(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- 2. Indexes
create index if not exists idx_posts_created_at on posts(created_at desc);
create index if not exists idx_comments_post_id on comments(post_id, created_at asc);

-- 3. RLS
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_likes enable row level security;
alter table comment_likes enable row level security;

-- 4. 先刪舊 policy（避免重複錯誤）
drop policy if exists "posts_read_all" on posts;
drop policy if exists "posts_insert_service" on posts;
drop policy if exists "posts_update_service" on posts;
drop policy if exists "comments_read_all" on comments;
drop policy if exists "comments_insert_auth" on comments;
drop policy if exists "comments_delete_own" on comments;
drop policy if exists "post_likes_read_all" on post_likes;
drop policy if exists "post_likes_insert_auth" on post_likes;
drop policy if exists "post_likes_delete_own" on post_likes;
drop policy if exists "comment_likes_read_all" on comment_likes;
drop policy if exists "comment_likes_insert_auth" on comment_likes;
drop policy if exists "comment_likes_delete_own" on comment_likes;

-- 5. 重建 policy
create policy "posts_read_all" on posts for select using (true);
create policy "posts_insert_service" on posts for insert with check (true);
create policy "posts_update_service" on posts for update using (true);

create policy "comments_read_all" on comments for select using (true);
create policy "comments_insert_auth" on comments for insert with check (auth.uid() = user_id);
create policy "comments_delete_own" on comments for delete using (auth.uid() = user_id);

create policy "post_likes_read_all" on post_likes for select using (true);
create policy "post_likes_insert_auth" on post_likes for insert with check (auth.uid() = user_id);
create policy "post_likes_delete_own" on post_likes for delete using (auth.uid() = user_id);

create policy "comment_likes_read_all" on comment_likes for select using (true);
create policy "comment_likes_insert_auth" on comment_likes for insert with check (auth.uid() = user_id);
create policy "comment_likes_delete_own" on comment_likes for delete using (auth.uid() = user_id);

-- 6. Triggers（likes/comments count 自動更新）
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

drop trigger if exists trg_post_likes_count on post_likes;
create trigger trg_post_likes_count
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

drop trigger if exists trg_comments_count on comments;
create trigger trg_comments_count
after insert or delete on comments
for each row execute function update_comments_count();
