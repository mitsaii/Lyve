-- ① 刪除 platform_url 僅為首頁（假資料/占位符）的演唱會
-- 這些是 seed.sql 中手動插入的 12 筆，非真實爬蟲資料
DELETE FROM concerts
WHERE platform_url IN (
  'https://kktix.com',
  'https://ibon.com.tw',
  'https://tixcraft.com',
  'https://ticketmaster.com.tw'
);

-- ② 刪除 Legacy 爬蟲抓到 GTM JS 程式碼當標題的壞資料
DELETE FROM concerts
WHERE artist LIKE '%function(w,d,s,l,i)%'
   OR artist LIKE '%w[l]=w[l]%'
   OR tour_zh LIKE '%function(w,d,s,l,i)%'
   OR tour_zh LIKE '%w[l]=w[l]%';

-- ③ 刪除 Kham 爬蟲抓到網站名當藝人名的壞資料
DELETE FROM concerts
WHERE artist IN ('寬宏售票系統', '寬宏售票', 'Kham')
   OR tour_zh IN ('寬宏售票系統', '寬宏售票');

-- ④ 刪除 Legacy 爬蟲抓到導覽列文字當標題的壞資料
DELETE FROM concerts
WHERE artist LIKE '%關於LEGACY%'
   OR artist LIKE '%演出節目%'
   OR tour_zh LIKE '%關於LEGACY%'
   OR tour_zh LIKE '%演出節目%';

-- ⑤ 刪除 Colatour 使用首頁 URL（非個別演唱會頁）且 tour_zh 為空的佔位資料
-- （Colatour 有個別 URL 的記錄保留；只有落在分類頁 hot.html 的才移除）
DELETE FROM concerts
WHERE platform_url = 'https://www.colatour.com.tw/webDM/taiwan/theme/concert/hot.html'
  AND (tour_zh IS NULL OR tour_zh = '' OR tour_zh = artist);

-- 確認清理結果
SELECT COUNT(*) AS remaining_fake FROM concerts
WHERE platform_url IN (
  'https://kktix.com',
  'https://ibon.com.tw',
  'https://tixcraft.com',
  'https://ticketmaster.com.tw'
)
OR artist LIKE '%function%'
OR tour_zh LIKE '%function%'
OR artist IN ('寬宏售票系統', '寬宏售票', 'Kham')
OR artist LIKE '%關於LEGACY%'
OR artist LIKE '%演出節目%';
