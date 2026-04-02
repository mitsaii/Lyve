-- Fix genre misclassifications
-- Generated: 2026-04-02

-- 告五人: cpop -> bands (台灣樂團)
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%告五人%' AND genre != 'bands';

-- 五月天: cpop -> bands (台灣搖滾樂團)
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%五月天%' AND genre != 'bands';

-- 茄子蛋: cpop -> bands (台灣樂團)
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%茄子蛋%' AND genre != 'bands';

-- 麋先生 MIXER: western -> bands (台灣搖滾樂團)
UPDATE concerts SET genre = 'bands' WHERE artist LIKE '%麋先生%' AND genre != 'bands';

-- ────────────────────────────────────────────
-- 日本藝人被錯分到其他類別

-- MISIA: -> jpop (日本R&B歌手)
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%MISIA%' AND genre != 'jpop';

-- amazarashi: -> jpop (日本搖滾樂團)
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%amazarashi%' AND genre != 'jpop';

-- KAZUYA KAMENASHI (亀梨和也): western -> jpop (日本歌手/演員)
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%KAMENASHI%' AND genre != 'jpop';

-- BUS: western -> western (泰國藝人，歸入西洋類)
-- 已正確，不需修正

-- ────────────────────────────────────────────
-- 西洋藝人被錯分到 kpop

-- Laufey: kpop -> western (冰島創作歌手)
UPDATE concerts SET genre = 'western' WHERE artist LIKE '%Laufey%' AND genre != 'western';

-- MIKA: kpop -> western (英/黎巴嫩流行歌手)
UPDATE concerts SET genre = 'western' WHERE artist LIKE '%MIKA%' AND genre != 'western';

-- ────────────────────────────────────────────
-- 華語/台語藝人被錯分到 kpop

-- 洪榮宏: kpop -> cpop (台語歌手)
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%洪榮宏%' AND genre != 'cpop';

-- 龍千玉: kpop -> cpop (台語歌手)
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%龍千玉%' AND genre != 'cpop';

-- 沈文程: kpop -> cpop (台語歌手)
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%沈文程%' AND genre != 'cpop';

-- 王建傑: kpop -> cpop (台灣歌手)
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%王建傑%' AND genre != 'cpop';

-- 齊豫: western -> cpop (台灣歌手)
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%齊豫%' AND genre != 'cpop';

-- 鄧麗君: kpop -> cpop (華語歌手經典回聲音樂會)
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%鄧麗君%' AND genre != 'cpop';

-- 羊駝小姐 Malpaca: kpop -> cpop (台灣藝人)
UPDATE concerts SET genre = 'cpop' WHERE artist LIKE '%Malpaca%' OR artist LIKE '%羊駝小姐%' AND genre != 'cpop';

-- ────────────────────────────────────────────
-- Billyrrom: western -> jpop (日本藝人)
UPDATE concerts SET genre = 'jpop' WHERE artist LIKE '%Billyrrom%' AND genre != 'jpop';

-- 丁噹 Della: -> cpop (已有獨立修正檔，保留)
