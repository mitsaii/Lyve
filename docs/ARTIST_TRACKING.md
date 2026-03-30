# 藝術家巡演監控工作流程

## 概述
本文件說明如何管理藝術家列表、搜尋台灣演唱會、並將新的演唱會添加到 Lyve 資料庫。

## 文件結構
```
lib/artistList.ts          ← 藝術家核心列表（可持續更新）
scripts/check_artist_concerts.py  ← 演唱會檢查腳本
docs/ARTIST_TRACKING.md    ← 本文件（工作流程說明）
```

## 工作流程

### 第 1 步：更新藝術家列表
當你有新的藝術家要追蹤時：

```bash
# 編輯 lib/artistList.ts
# 在對應的 region 區塊新增：
{
  name: '藝術家名稱',
  instagram: '@instgramHandle',
  region: 'western' | 'kpop' | 'jpop' | 'taiwan',
  description: '簡短描述',
  genre: 'pop' | 'rock' | 'kpop' | 'jpop'
}
```

**去重機制**：系統會自動跳過重複的藝術家（根據 name 和 instagram）

### 第 2 步：手動搜尋演唱會信息

由於 IG 和售票網站有反爬機制，建議手動檢查以下管道：

#### 💡 推薦搜尋順序

1. **KKTIX** (台灣主要售票平台)
   - https://kktix.com
   - 搜尋藝術家名稱

2. **ibon** (7-11 買票系統)
   - https://ibon.com.tw
   - 搜尋藝術家名稱

3. **Live Nation Taiwan** (國際巡迴)
   - https://www.livenation.com.tw
   - 搜尋藝術家名稱

4. **Kpopn** (K-POP 新聞)
   - https://www.kpopn.com
   - 搜尋「[藝術家名稱] 台灣」

5. **Google 搜尋**
   - `[藝術家名稱] 台灣 演唱會 2026`
   - `[藝術家名稱] Taiwan concert`

#### 📍 演唱會必填信息

找到演唱會後，記錄以下信息：

```sql
artist          → 藝術家名稱
emoji           → 相關 emoji (e.g., 🎤, 🎸)
date_str        → 日期 (格式: 2026/04/25 或 2026/04/25–26)
city_zh         → 城市中文 (台北、高雄、台中)
city_en         → 城市英文 (Taipei, Kaohsiung, Taichung)
venue_zh        → 場地中文 (e.g., 台北小巨蛋)
venue_en        → 場地英文 (e.g., Taipei Arena)
tour_zh         → 巡演名稱（中文）
tour_en         → 巡演名稱（英文）
price_zh        → 票價（中文，e.g., NT$ 1,800-8,800）
price_en        → 票價（英文，通常同上）
platform        → 售票平台 (KKTIX, ibon, 拓元售票, Live Nation Taiwan)
platform_url    → 售票網址
genre           → 流派 (pop, rock, kpop, jpop)
status          → 狀態 (selling, pending, sold_out)
is_hot          → 是否熱門 (true/false)
grad_css        → 漸層色 (e.g., linear-gradient(135deg, #ff6a88 0%, #6a11cb 100%))
image_url       → 海報圖片 URL (可無)
```

### 第 3 步：添加到資料庫

找到演唱會信息後，將其添加到 `supabase-seed.sql`：

```sql
INSERT INTO concerts (...) VALUES (
  '藝術家名稱',
  '🎤',
  '2026/04/25',
  '台北',
  'Taipei',
  '台北小巨蛋',
  'Taipei Arena',
  '巡迴演唱會',
  'Tour Name',
  'NT$ 1,800-8,800',
  'NT$ 1,800-8,800',
  'KKTIX',
  'https://kktix.com/...',
  'pop',
  'selling',
  false,
  'linear-gradient(135deg, #ff6a88 0%, #6a11cb 100%)',
  'https://example.com/poster.jpg'
);
```

## 狀態說明

| 狀態 | 說明 |
|------|------|
| `selling` | 正在售票 |
| `pending` | 待確認/近期開賣 |
| `sold_out` | 已售罄 |

## Tips

### 💎 尋找高清海報
- 官方 Facebook 粉絲頁
- 售票網站的活動頁面
- 藝術家官網的新聞稿
- Artist IG Story 的存檔

### 🎨 Emoji 選擇
```
🎤 歌手/主唱
🎸 樂團/吉他
🎹 鋼琴/電子音樂
🎺 爵士/銅管
💃 舞者/跳舞
👯 女團/男團
⭐ 明星/偶像
```

### 🎯 漸層顏色
可以通過以下方式生成：
- https://www.colordot.io
- 選擇兩個相符藝術家風格的顏色
- 格式: `linear-gradient(135deg, #color1 0%, #color2 100%)`

## Supabase 連接

演唱會資料會自動同步到 Supabase：
- 資料庫: `concerts` 表
- 欄位對應到 `supabase-seed.sql` 的 INSERT 語句

## 常見 Q&A

**Q: 如何檢查是否已有重複的藝術家？**
A: 檢查 `lib/artistList.ts` 中是否已存在相同的 `name` 或 `instagram`

**Q: 演唱會已售罄還要添加嗎？**
A: 可以，將 `status` 設為 `sold_out`，方便記錄歷史

**Q: 沒有找到海報圖片怎麼辦？**
A: `image_url` 可以設為 `null`，頁面會使用預設背景

**Q: 如何更新既有演唱會的信息？**
A: 在 `supabase-seed.sql` 中找到對應行，修改相關欄位後重新部署

---

**最後更新**: 2026-03-27
**負責人**: Lyve 藝術家追蹤系統
