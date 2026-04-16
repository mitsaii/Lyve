'use client'

import { Concert } from '@/types/concert'
import { useLang } from '@/contexts/LangContext'
import { useAlert } from '@/contexts/AlertContext'
import { IconBell } from '../ui/Icons'

interface AlertPromptSheetProps {
  concert: Concert | null
  onClose: () => void
}

export function AlertPromptSheet({ concert, onClose }: AlertPromptSheetProps) {
  const { t } = useLang()
  const { toggleAlert, hasAlert } = useAlert()

  if (!concert) return null

  const handleEnable = () => {
    if (!hasAlert(concert.id)) {
      toggleAlert(concert.id)
    }
    onClose()
  }

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* 底部彈層 */}
      <div className="fixed inset-x-0 bottom-0 z-50 slide-up">
        <div
          className="max-w-[480px] mx-auto rounded-t-3xl p-6"
          style={{ background: 'var(--surface)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 把手 */}
          <div className="flex justify-center mb-5">
            <div className="w-12 h-1 rounded-full" style={{ background: 'var(--muted)' }} />
          </div>

          {/* 圖示 + 標題 */}
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--accent)22' }}
            >
              <IconBell className="w-7 h-7 text-[var(--accent)]" />
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
              {t('要同時開啟搶票提醒嗎？', 'Enable ticket alert?')}
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {t(
                `將於「${concert.artist}」開搶前 10 分鐘通知你`,
                `Get notified 10 min before ${concert.artist} tickets go on sale`
              )}
            </p>
          </div>

          {/* 按鈕 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleEnable}
              className="w-full py-3.5 rounded-2xl font-semibold text-base transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {t('開啟提醒', 'Enable Alert')}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-medium text-base transition-all hover:opacity-80 active:scale-95"
              style={{ background: 'var(--faint)', color: 'var(--muted)' }}
            >
              {t('不用了', 'No Thanks')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
