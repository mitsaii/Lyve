import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 gap-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-gray-600 mb-4">頁面未找到</p>
        <p className="text-sm text-gray-500 mb-6">看起來你訪問的頁面不存在</p>
      </div>
      <Link
        href="/"
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        返回首頁
      </Link>
    </div>
  )
}
