// lib/shareInstagram.ts
// 把演唱會資訊畫成 1080x1920（IG 限動尺寸）的圖片，再透過系統分享選單發到 IG 限動。
// 使用者選「Instagram 限時動態」後，圖片會自動成為限動背景，不需手動從相簿挑。

import { Concert, Lang } from '@/types/concert'

const STORY_W = 1080
const STORY_H = 1920

/** 嘗試載入圖片（含 CORS）。失敗時回 null。 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** cover 模式繪圖，類似 CSS background-size: cover */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const ratio = Math.max(w / img.width, h / img.height)
  const dw = img.width * ratio
  const dh = img.height * ratio
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

/** 把 grad_css（如 "linear-gradient(135deg, #abc 0%, #def 100%)"）解析成 [color1, color2]，失敗回預設色 */
function parseGradient(gradCss: string | null | undefined): [string, string] {
  const fallback: [string, string] = ['#7C3AED', '#EC4899']
  if (!gradCss) return fallback
  const matches = gradCss.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g)
  if (matches && matches.length >= 2) return [matches[0], matches[1]]
  return fallback
}

/** 自動換行：把長字串依最大寬度切成多行 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return []
  // 中文沒有空格，需要逐字檢測
  const lines: string[] = []
  let current = ''
  for (const ch of text) {
    const test = current + ch
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = ch
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

/** 繪製 IG 限動圖片並回傳 PNG Blob */
async function renderStoryImage(concert: Concert, lang: Lang): Promise<Blob | null> {
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = STORY_W
  canvas.height = STORY_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // ---- 背景 ----
  const [c1, c2] = parseGradient(concert.grad_css)
  const grad = ctx.createLinearGradient(0, 0, STORY_W, STORY_H)
  grad.addColorStop(0, c1)
  grad.addColorStop(1, c2)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, STORY_W, STORY_H)

  // 若有封面圖，疊在漸層上面（再蓋一層深色遮罩確保文字可讀）
  if (concert.image_url) {
    const img = await loadImage(concert.image_url)
    if (img) {
      drawCover(ctx, img, 0, 0, STORY_W, STORY_H)
      // 深色遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.fillRect(0, 0, STORY_W, STORY_H)
      // 漸層色調再疊一次（保持品牌感）
      ctx.globalAlpha = 0.35
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, STORY_W, STORY_H)
      ctx.globalAlpha = 1
    }
  }

  // ---- 文字內容 ----
  ctx.textAlign = 'center'
  ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 4

  const cx = STORY_W / 2
  let y = 480

  // 上方小標
  ctx.font = '500 44px -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(lang === 'zh' ? '🎤 一起去看演唱會！' : '🎤 Let\'s go to this concert!', cx, y)
  y += 120

  // 藝人名（最大、加粗）— 自動換行
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 130px -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
  const artistLines = wrapText(ctx, concert.artist, STORY_W - 120)
  for (const line of artistLines.slice(0, 2)) {
    ctx.fillText(line, cx, y)
    y += 150
  }
  y += 20

  // Tour 名稱
  const tour = lang === 'zh' ? concert.tour_zh : concert.tour_en
  if (tour) {
    ctx.font = '600 56px -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    const tourLines = wrapText(ctx, tour, STORY_W - 160)
    for (const line of tourLines.slice(0, 3)) {
      ctx.fillText(line, cx, y)
      y += 72
    }
  }
  y += 60

  // 日期
  ctx.font = '700 64px -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(`📅 ${concert.date_str}`, cx, y)
  y += 90

  // 場地 · 城市
  const venue = lang === 'zh' ? concert.venue_zh : concert.venue_en
  const city = lang === 'zh' ? concert.city_zh : concert.city_en
  ctx.font = '500 48px -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  const venueLines = wrapText(ctx, `📍 ${venue} · ${city}`, STORY_W - 120)
  for (const line of venueLines.slice(0, 2)) {
    ctx.fillText(line, cx, y)
    y += 60
  }

  // 底部 CTA / 浮水印
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.font = '600 38px -apple-system, "PingFang TC", "Microsoft JhengHei", sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(lang === 'zh' ? '👉 一起揪起來' : '👉 Join me!', cx, STORY_H - 180)
  ctx.font = '500 30px -apple-system, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText('taiwan-concerts', cx, STORY_H - 120)

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png', 0.95)
  })
}

export interface ShareResult {
  /** 成功打開分享選單或跳到 IG */
  ok: boolean
  /** fallback 走複製連結 */
  copied: boolean
}

/** 下載限動圖片到裝置 */
export async function downloadStoryImage(
  concert: Concert,
  lang: Lang,
): Promise<boolean> {
  try {
    const blob = await renderStoryImage(concert, lang)
    if (!blob) return false
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${concert.artist}-story.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 直接開啟 IG App（手機）或複製連結（桌機）
 * mode: 'story' → 跳 IG 限時動態相機；'app' → 跳 IG 首頁
 */
export async function openInstagramDirect(
  concert: Concert,
  lang: Lang,
  shareUrl: string,
  mode: 'story' | 'app' = 'story',
): Promise<ShareResult> {
  const text = [
    `🎤 ${concert.artist}`,
    lang === 'zh' ? concert.tour_zh : concert.tour_en,
    `📍 ${lang === 'zh' ? concert.venue_zh : concert.venue_en} · ${lang === 'zh' ? concert.city_zh : concert.city_en}`,
    `📅 ${concert.date_str}`,
    '',
    shareUrl,
  ].filter(Boolean).join('\n')

  // 複製文字到剪貼簿
  try {
    await navigator.clipboard.writeText(text)
  } catch { /* 忽略 */ }

  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent || ''
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua)
    if (isMobile) {
      const scheme = mode === 'story' ? 'instagram://story-camera' : 'instagram://'
      window.location.href = scheme
      return { ok: true, copied: true }
    }
  }

  // 桌機：複製連結
  return { ok: false, copied: true }
}

/**
 * 把演唱會分享到 IG 限時動態（手機）
 *  1. 嘗試以圖片走系統分享選單（iOS/Android 上 IG 限動會自動載入圖片）
 *  2. 不支援 file share 時退回 instagram://story-camera URL scheme
 *  3. 桌機則複製連結到剪貼簿
 */
export async function shareConcertToInstagram(
  concert: Concert,
  lang: Lang,
  shareUrl: string,
): Promise<ShareResult> {
  const text = [
    `🎤 ${concert.artist}`,
    lang === 'zh' ? concert.tour_zh : concert.tour_en,
    `📍 ${lang === 'zh' ? concert.venue_zh : concert.venue_en} · ${lang === 'zh' ? concert.city_zh : concert.city_en}`,
    `📅 ${concert.date_str}`,
    '',
    shareUrl,
  ].filter(Boolean).join('\n')

  // ---- 1. 圖片分享（最佳體驗）----
  try {
    const blob = await renderStoryImage(concert, lang)
    if (blob && typeof navigator !== 'undefined') {
      const file = new File([blob], `${concert.artist}-concert.png`, { type: 'image/png' })
      const nav = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean
      }
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({
            files: [file],
            title: concert.artist,
            text,
          })
          return { ok: true, copied: false }
        } catch (err) {
          // 使用者取消（AbortError）也算「打開過」
          if ((err as Error)?.name === 'AbortError') {
            return { ok: true, copied: false }
          }
          // 其他錯誤往下走 fallback
        }
      }
    }
  } catch {
    // 繪圖失敗，往下走 fallback
  }

  // ---- 2. 純文字分享（行動版瀏覽器不支援 file 時）----
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: concert.artist, text, url: shareUrl })
      return { ok: true, copied: false }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return { ok: true, copied: false }
      }
    }
  }

  // ---- 3. URL Scheme 直接打開 IG 限動相機（裝有 IG 的手機）----
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent || ''
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua)
    if (isMobile) {
      // 先複製文字以便使用者貼上
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // 忽略
      }
      window.location.href = 'instagram://story-camera'
      return { ok: true, copied: true }
    }
  }

  // ---- 4. 桌機 fallback：複製連結 ----
  try {
    await navigator.clipboard.writeText(text)
    return { ok: false, copied: true }
  } catch {
    return { ok: false, copied: false }
  }
}
