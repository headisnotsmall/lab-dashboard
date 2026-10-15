import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import BorrowerOptions from '@/components/BorrowerOptions'

export const metadata: Metadata = {
  title: 'Lab 系統管理',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-gray-50 min-h-screen text-gray-900 antialiased">
        <Nav />
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6">{children}</main>
        <BorrowerOptions />
      </body>
    </html>
  )
}
