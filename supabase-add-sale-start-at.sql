-- 新增開賣時間欄位（搶票提醒功能所需）
-- 在 Supabase Dashboard > SQL Editor 執行此腳本

ALTER TABLE concerts
  ADD COLUMN IF NOT EXISTS sale_start_at TIMESTAMPTZ;

-- 補充說明：
-- sale_start_at 儲存格式為 ISO 8601（含時區），例如：'2026-04-01T10:00:00+08:00'
-- 若此欄位為 NULL，搶票提醒功能將不為該場次設定倒數（避免使用演出日期誤判）

-- 範例：手動更新特定場次的開賣時間
-- UPDATE concerts
--   SET sale_start_at = '2026-04-01T10:00:00+08:00'
--   WHERE artist = '某藝人' AND date_str LIKE '2026/05%';
