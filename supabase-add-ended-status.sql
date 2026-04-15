-- Migration: 新增 'ended' 狀態，並將舊的「日期已過被標為 sold_out」資料修正為 ended
--
-- 背景：
--   sold_out = 票真的賣完（手動標記）
--   ended    = 演唱會日期已過（cron 自動設定）
--
-- 執行方式：在 Supabase SQL Editor 貼上執行即可

-- Step 1: 若 status 欄位有 check constraint，先移除再重建（加入 'ended'）
--   Supabase 預設用 text 類型，通常沒有 enum constraint，
--   但如果你有自訂 constraint，請先確認名稱後修改以下語句。
-- （若沒有 constraint 可跳過 Step 1）
--
-- ALTER TABLE concerts DROP CONSTRAINT IF EXISTS concerts_status_check;
-- ALTER TABLE concerts ADD CONSTRAINT concerts_status_check
--   CHECK (status IN ('pending', 'selling', 'sold_out', 'ended'));

-- Step 2: 將舊有「日期已過但被標為 sold_out」的資料改成 ended
--   ⚠️ 注意：只改掉那些「演唱會日期在今天以前」且 sold_out 的資料。
--   若某場真的票賣完（例如你手動標記過），請先確認再執行。
--
-- 以下 SQL 會把 date_str 最後日期 < 今天的所有 sold_out 改成 ended：

UPDATE concerts
SET status = 'ended'
WHERE status = 'sold_out'
  AND (
    -- 處理日期範圍格式（如 2026/04/25–26 或 2026/04/25-26）
    -- 取最後一段的日期與當前月份組合，再與今天比較
    CASE
      -- 有連字號或破折號：取年月 + 第二段的日
      WHEN date_str ~ '[–\-]\d{1,2}$' THEN
        to_date(
          split_part(date_str, '/', 1) || '/' ||
          split_part(date_str, '/', 2) || '/' ||
          regexp_replace(date_str, '^.+[–\-](\d{1,2})$', '\1'),
          'YYYY/MM/DD'
        )
      -- 無連字號：直接取前10碼
      ELSE
        to_date(left(replace(date_str, '/', '-'), 10), 'YYYY-MM-DD')
    END
  ) < CURRENT_DATE;

-- Step 3: 確認結果
SELECT status, count(*) FROM concerts GROUP BY status ORDER BY status;
