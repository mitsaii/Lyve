-- 修復 concerts 重複資料 + 建立防重複約束
-- 在 Supabase SQL Editor 一次執行

begin;

-- 1) 刪除重複活動：保留每組活動最小 id 的那筆
with ranked as (
  select
    id,
    row_number() over (
      partition by
        lower(trim(artist)),
        lower(trim(date_str)),
        lower(trim(coalesce(city_zh, city_en, ''))),
        lower(trim(coalesce(venue_zh, venue_en, ''))),
        lower(trim(coalesce(tour_zh, tour_en, '')))
      order by id asc
    ) as rn
  from concerts
)
delete from concerts c
using ranked r
where c.id = r.id
  and r.rn > 1;

-- 2) 建立唯一約束，避免同一活動再次被重複寫入
-- 若你資料庫中已有同名 constraint，會被捕捉並略過
DO $$
BEGIN
  ALTER TABLE concerts
    ADD CONSTRAINT concerts_unique_show
    UNIQUE (artist, date_str, city_zh, venue_zh, tour_zh);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

commit;

-- 3) 驗證：看目前是否還有重複
-- 這段可重跑，應該回傳 0 筆
select
  artist,
  date_str,
  city_zh,
  venue_zh,
  tour_zh,
  count(*) as dup_count
from concerts
group by artist, date_str, city_zh, venue_zh, tour_zh
having count(*) > 1
order by dup_count desc;
