-- Fix genre misclassifications (Round 2)
-- Generated: 2026-04-22
-- 根據使用者回報：Wah SUB 系列是樂團活動，並順帶修正其他明確錯誤分類

-- ════════════════════════════════════════════════
-- 台灣樂團：kpop → bands
-- ════════════════════════════════════════════════

-- Wah SUB！系列（臺北流行音樂中心獨立樂團聯演）
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%Wah SUB%' AND genre != 'bands';

-- icyball 冰球樂團
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%冰球樂團%' AND genre != 'bands';
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%icyball%' AND genre != 'bands';

-- 男子漢樂團
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%男子漢樂團%' AND genre != 'bands';

-- EmptyORio（台灣樂團）
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%EmptyORio%' AND genre != 'bands';

-- 倒車入庫（台灣獨立樂團）
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%倒車入庫%' AND genre != 'bands';

-- NUMBER 18（台灣樂團）
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%NUMBER 18%' AND genre != 'bands';

-- RESONO（台灣樂團）
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%RESONO%' AND genre != 'bands';

-- ════════════════════════════════════════════════
-- 日本藝人：kpop → jpop
-- ════════════════════════════════════════════════

-- LiSA（日本動漫歌手）
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%LiSA%' AND genre != 'jpop';

-- MIKA NAKASHIMA 中島美嘉
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%NAKASHIMA%' AND genre != 'jpop';
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%中島美嘉%' AND genre != 'jpop';

-- May'n（日本歌手）
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%May''n%' AND genre != 'jpop';

-- 水樹奈奈
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%水樹奈奈%' AND genre != 'jpop';

-- ════════════════════════════════════════════════
-- 台灣/華語藝人：western → cpop
-- ════════════════════════════════════════════════

-- 鄭興（台灣創作歌手）
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%鄭興%' AND genre != 'cpop';

-- 艾薇 Ivy（台灣歌手）
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%艾薇%' AND genre != 'cpop';
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%艾薇Ivy%' AND genre != 'cpop';

-- 葵剛（台灣創作歌手）
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%葵剛%' AND genre != 'cpop';

-- 白吉勝（台灣歌手）
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%白吉勝%' AND genre != 'cpop';

-- 陳德修（台灣歌手）
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%陳德修%' AND genre != 'cpop';

-- ════════════════════════════════════════════════
-- 韓國藝人：western → kpop
-- ════════════════════════════════════════════════

-- 李昇基 X 李洪基
UPDATE concerts SET genre = 'kpop' WHERE artist LIKE '%李昇基%' AND genre != 'kpop';
UPDATE concerts SET genre = 'kpop' WHERE artist LIKE '%李洪基%' AND genre != 'kpop';

-- KANGIN 見面會
UPDATE concerts SET genre = 'kpop' WHERE artist LIKE '%KANGIN%' AND genre != 'kpop';

-- ════════════════════════════════════════════════
-- 台灣/華語藝人：kpop → cpop
-- ════════════════════════════════════════════════

-- 後站人、我萱
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%後站人%' AND genre != 'cpop';

-- 伯爵先生（台灣創作歌手）
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%伯爵先生%' AND genre != 'cpop';

-- 陳大衛（台灣鋼琴家）
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%陳大衛%' AND genre != 'cpop';
