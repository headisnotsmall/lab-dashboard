import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lab 系統管理',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <a href="/" className="text-lg font-semibold text-gray-900">Lab 系統管理</a>
          <div className="flex items-center gap-3">
            <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700">設定</a>
            <a href="/devices/new"
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              + 新增設備
            </a>
          </div>
        </nav>
        <main className="max-w-screen-xl mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  )
}
