'use client'

import Link from 'next/link'
import { useLang } from '@/contexts/LangContext'

export default function AboutPage() {
  const { t } = useLang()

  return (
    <div className="pb-32 min-h-screen">
      <div className="px-5 pt-8 max-w-lg mx-auto space-y-8">

        {/* Logo + 標題 */}
        <div className="flex flex-col gap-2">
          <span
            className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Lyve ✦
          </span>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            {t('關於我們', 'About Us')}
          </h1>
        </div>

        {/* 介紹 */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
            {t(
              'Lyve 是一個專為台灣樂迷打造的演唱會資訊平台。我們相信每一場演出，都值得被好好記憶。',
              'Lyve is a concert information platform built for music fans in Taiwan. We believe every live show deserves to be remembered.'
            )}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t(
              '無論是 K-pop、搖滾、獨立樂團還是大型音樂節——我們整合最新的演出資訊，幫你不錯過任何一場重要的現場。',
              'Whether it\'s K-pop, rock, indie bands, or music festivals — we aggregate the latest concert info so you never miss a show that matters.'
            )}
          </p>
        </div>

        {/* 核心功能 */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('我們做什麼', 'What We Do')}
          </h2>
          <div className="space-y-2">
            {[
              { emoji: '🎯', zh: '整合全台演唱會與音樂節資訊', en: 'Aggregate concerts & festivals across Taiwan' },
              { emoji: '🔔', zh: '搶票提醒，不再錯過開賣瞬間', en: 'Sale alerts so you never miss the drop' },
              { emoji: '❤️', zh: '收藏你最期待的演出', en: 'Save shows you can\'t wait to see' },
              { emoji: '🎫', zh: '數位票根，紀錄每一場珍貴回憶', en: 'Digital ticket stubs for every precious memory' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'var(--faint)' }}
              >
                <span className="text-lg flex-shrink-0">{item.emoji}</span>
                <p className="text-sm" style={{ color: 'var(--text)' }}>
                  {t(item.zh, item.en)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Alpha 說明 */}
        <div
          className="rounded-2xl p-5 space-y-2"
          style={{
            background: 'var(--faint)',
            border: '1px solid var(--accent)',
            borderOpacity: 0.2,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold font-mono px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              v0.1.0-alpha
            </span>
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              {t('目前為 Alpha 測試版', 'Currently in Alpha')}
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t(
              'Lyve 正在持續成長中。感謝你在最早期就加入我們——你的每一個回饋，都讓我們變得更好。',
              'Lyve is still growing. Thank you for joining us so early — your feedback makes us better with every release.'
            )}
          </p>
        </div>

        {/* 聯絡 */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('聯絡我們', 'Contact')}
          </h2>
          <a
            href="https://www.threads.com/@lyve__________?igshid=NTc4MTIwNjQ2YQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--card)', boxShadow: 'var(--shadow)', color: 'var(--text)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }}>
              <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.75-.375-1.36-.75-1.82-.513-.62-1.275-.936-2.27-.943h-.03c-.735 0-1.932.206-2.653 1.472l-1.773-1.017C8.478 5.58 10.004 4.99 11.979 4.99h.044c3.013.022 4.818 1.842 5.198 5.198.168.03.334.064.497.104 1.538.386 2.694 1.23 3.337 2.44.952 1.79.963 4.493-.815 6.229-1.678 1.643-3.81 2.351-6.918 2.374l-.136-.335Z" />
            </svg>
            <div>
              <p className="text-sm font-medium">Threads</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>@lyve__________</p>
            </div>
          </a>
        </div>

        {/* 回首頁 */}
        <Link
          href="/"
          className="block text-center text-sm py-3 rounded-2xl font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--faint)', color: 'var(--text)' }}
        >
          ← {t('回到首頁', 'Back to Home')}
        </Link>
      </div>
    </div>
  )
}
