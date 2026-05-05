/**
 * scrapeTicketTime.ts
 *
 * 從票務平台頁面抓取「開賣時間」，回傳 ISO 8601 字串（+08:00 台灣時間）
 *
 * 支援平台：
 *  - KKTIX (kktix.com)         → JSON-LD offers.availabilityStarts
 *  - 拓元 Tixcraft (tixcraft.com) → 頁面文字 "售票時間" 附近的日期
 *  - 通用 fallback              → JSON-LD → meta tag → 關鍵字掃描
 */

export type ScrapeResult = {
  sale_start_at: string | null
  source: string // 說明是哪個方法找到的，方便 debug
}

// 台灣常見的日期時間格式：2026/04/10 12:00、2026-04-10 12:00
const TW_DATETIME_RE = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{2})/

// 搜尋這些關鍵字附近的日期
const SALE_KEYWORDS = [
  '售票時間', '開始售票', '售票開始', '開賣時間', '開賣日期',
  '開放購票', '購票開始', '搶票時間', '開始販售', '販售時間',
  'on sale', 'sale start', 'tickets on sale',
]

/** 將台灣日期字串轉為 Date（預設 +08:00 時區） */
function parseTWDateTime(str: string): Date | null {
  // 先試 ISO 格式
  const iso = new Date(str)
  if (!isNaN(iso.getTime())) return iso

  // 試 "2026/04/10 12:00" 或 "2026-04-10 12:00"
  const m = str.match(TW_DATETIME_RE)
  if (m) {
    const [, y, mo, d, h, mi] = m
    return new Date(
      `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi}:00+08:00`
    )
  }
  return null
}

/** 把合法的 Date 轉為 ISO 字串，否則回傳 null */
function toISO(d: Date | null): string | null {
  if (!d || isNaN(d.getTime())) return null
  return d.toISOString()
}

/** 移除 HTML 標籤，只留純文字（供關鍵字掃描用） */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── 方法 1：JSON-LD structured data ─────────────────────────────────────────
function tryJsonLd(html: string): string | null {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1])
      const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data]
      for (const node of nodes) {
        // Schema.org Event → offers.availabilityStarts（KKTIX 用這個）
        const avail =
          node?.offers?.availabilityStarts ??
          node?.offers?.[0]?.availabilityStarts ??
          node?.startDate  // 有些平台只有 startDate
        if (avail) {
          const d = parseTWDateTime(String(avail))
          if (d) return toISO(d)
        }
      }
    } catch {
      // JSON 解析失敗，繼續試下一個
    }
  }
  return null
}

// ─── 方法 2：KKTIX 特化 ──────────────────────────────────────────────────────
function tryKKTIX(html: string): string | null {
  // KKTIX 有時把開賣時間放在 data attribute 或特定 class
  // e.g. data-start-at="2026-04-01T12:00:00+08:00"
  const dataAttr = html.match(/data-(?:start-at|sale-start)[^=]*="([^"]+)"/)
  if (dataAttr) {
    const d = parseTWDateTime(dataAttr[1])
    if (d) return toISO(d)
  }

  // 文字掃描：找「開始販售」、「售票開始」附近的日期
  const textMatch = html.match(
    /(?:開始販售|售票開始|開始售票|開賣)[^\d<]{0,30}(\d{4}[\/-]\d{1,2}[\/-]\d{1,2}\s+\d{1,2}:\d{2})/i
  )
  if (textMatch) {
    const d = parseTWDateTime(textMatch[1])
    if (d) return toISO(d)
  }

  return null
}

// ─── 方法 3：拓元 Tixcraft 特化 ───────────────────────────────────────────────
function tryTixcraft(html: string): string | null {
  // Tixcraft 在 <table> 或 <div> 裡有 "售票時間" label
  // e.g.  售票時間</td><td>2026/04/01 12:00 開始
  const match = html.match(
    /售票時間[^<\d]{0,50}(\d{4}[\/-]\d{1,2}[\/-]\d{1,2}[^\d<]{0,10}\d{1,2}:\d{2})/i
  )
  if (match) {
    const d = parseTWDateTime(match[1])
    if (d) return toISO(d)
  }
  return null
}

// ─── 方法 4：meta tag ────────────────────────────────────────────────────────
function tryMetaTags(html: string): string | null {
  // 有些平台會放 <meta property="event:start_time" content="...">
  const metaPatterns = [
    /meta[^>]+property="event:start_time"[^>]+content="([^"]+)"/i,
    /meta[^>]+name="event-date"[^>]+content="([^"]+)"/i,
    /meta[^>]+itemprop="availabilityStarts"[^>]+content="([^"]+)"/i,
  ]
  for (const re of metaPatterns) {
    const m = html.match(re)
    if (m) {
      const d = parseTWDateTime(m[1])
      if (d) return toISO(d)
    }
  }
  return null
}

// ─── 方法 5：通用關鍵字掃描 ──────────────────────────────────────────────────
function tryGenericKeywords(html: string): string | null {
  const text = stripHtml(html)

  for (const keyword of SALE_KEYWORDS) {
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
    if (idx === -1) continue

    // 關鍵字後的 300 個字元裡找日期
    const segment = text.slice(idx, idx + 300)
    const m = segment.match(TW_DATETIME_RE)
    if (m) {
      const [, y, mo, d, h, mi] = m
      const date = new Date(
        `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${mi}:00+08:00`
      )
      if (!isNaN(date.getTime())) return date.toISOString()
    }
  }
  return null
}

// ─── 主函式 ──────────────────────────────────────────────────────────────────
export async function scrapeTicketSaleTime(url: string): Promise<ScrapeResult> {
  let html: string

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      return { sale_start_at: null, source: `http-error-${res.status}` }
    }
    html = await res.text()
  } catch (e) {
    return { sale_start_at: null, source: `fetch-error: ${String(e).slice(0, 80)}` }
  }

  // 依序嘗試各方法，第一個找到的就回傳
  const jsonLd = tryJsonLd(html)
  if (jsonLd) return { sale_start_at: jsonLd, source: 'json-ld' }

  if (url.includes('kktix.com')) {
    const r = tryKKTIX(html)
    if (r) return { sale_start_at: r, source: 'kktix' }
  }

  if (url.includes('tixcraft.com') || url.includes('tixCraft')) {
    const r = tryTixcraft(html)
    if (r) return { sale_start_at: r, source: 'tixcraft' }
  }

  const meta = tryMetaTags(html)
  if (meta) return { sale_start_at: meta, source: 'meta-tag' }

  const generic = tryGenericKeywords(html)
  if (generic) return { sale_start_at: generic, source: 'keyword-scan' }

  return { sale_start_at: null, source: 'not-found' }
}
