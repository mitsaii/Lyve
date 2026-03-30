'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 gap-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">😅 出錯了</h1>
        <p className="text-gray-600 mb-4">
          {error.message || '發生了一個未預期的錯誤'}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        重新嘗試
      </button>
    </div>
  )
}
