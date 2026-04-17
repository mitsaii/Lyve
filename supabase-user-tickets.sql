-- ============================================================
-- user_tickets table
-- Run this in your Supabase SQL editor to enable
-- cloud sync for the "My Tickets" feature.
-- ============================================================

create table if not exists public.user_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  concert_name text not null,
  artist       text not null,
  venue        text,
  date_str     date not null,
  image_url    text,               -- Supabase Storage URL or external URL
  color        text not null default 'navy',
  notes        text,
  created_at   timestamptz not null default now()
);

-- Row Level Security: users can only access their own tickets
alter table public.user_tickets enable row level security;

create policy "Users read own tickets"
  on public.user_tickets for select
  using (auth.uid() = user_id);

create policy "Users insert own tickets"
  on public.user_tickets for insert
  with check (auth.uid() = user_id);

create policy "Users delete own tickets"
  on public.user_tickets for delete
  using (auth.uid() = user_id);

-- Optional: Storage bucket for ticket images
-- Run this separately in the Supabase dashboard > Storage > New Bucket
-- Bucket name: ticket-images  (Public: true)

-- After creating the bucket, add this storage policy:
-- insert into storage.policies (name, bucket_id, definition)
-- values ('Users upload ticket images', 'ticket-images',
--   '(auth.uid() = (storage.foldername(name))[1]::uuid)');
