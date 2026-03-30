<p align="center">
  <img src="public/lyve-logo.png" alt="Lyve Logo" width="600"/>
</p>

# Lyve

台灣演唱會資訊平台 - 即時掌握最新演出訊息

## 功能特色

- 🎵 即時演出資訊
- 🔍 快速搜尋功能
- 📅 演出日曆檢視
- ❤️ 收藏功能 (支援本地與雲端同步)
- 🌓 深色/淺色主題切換
- 🌏 中英文雙語支援

## 技術架構

- **框架**: Next.js 14 (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS + CSS Variables
- **後端**: Supabase (PostgreSQL + Realtime + Auth)
- **狀態管理**: React Context API
- **字型**: Noto Serif TC + Space Mono

## 開始使用

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 Supabase

在 Supabase 專案中執行以下 SQL：

```sql
-- 建立 concerts 資料表
create table concerts (
  id uuid primary key default gen_random_uuid(),
  artist text not null,
  emoji text not null,
  date_str text not null,
  city_zh text not null,
  city_en text not null,
  venue_zh text not null,
  venue_en text not null,
  tour_zh text not null,
  tour_en text not null,
  price_zh text not null,
  price_en text not null,
  platform text not null,
  platform_url text not null,
  genre text not null,
  status text not null,
  is_hot boolean default false,
  grad_css text,
  created_at timestamp with time zone default now()
);

-- 建立 saved_concerts 資料表
create table saved_concerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  concert_id uuid references concerts(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, concert_id)
);

-- 啟用 RLS
alter table concerts enable row level security;
alter table saved_concerts enable row level security;

-- concerts 政策
create policy "Everyone can read concerts"
  on concerts for select
  using (true);

-- saved_concerts 政策
create policy "Users can read own saved concerts"
  on saved_concerts for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved concerts"
  on saved_concerts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own saved concerts"
  on saved_concerts for delete
  using (auth.uid() = user_id);
```

### 3. 設定環境變數

建立 `.env.local` 檔案：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 即可檢視。

## 資料夾結構

```
app/
  layout.tsx          # 主布局 (Providers + Header + TabBar)
  page.tsx            # 首頁
  search/page.tsx     # 搜尋頁
  calendar/page.tsx   # 日曆頁
  saved/page.tsx      # 收藏頁
  globals.css         # 全域樣式

components/
  layout/             # Header, TabBar
  ui/                 # StatusTag, SectionLabel
  concerts/           # ConcertCard, FeaturedCard, ConcertModal, GenreChips
  home/               # HeroSection, Countdown

contexts/             # ThemeContext, LangContext, SavedContext
lib/                  # utils, supabase clients
types/                # TypeScript 類型定義
```

## 授權

MIT
# Lyve
