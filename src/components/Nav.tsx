'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import OperatorPicker from '@/components/OperatorPicker'

const LINKS = [
  { href: '/', label: '設備總覽', short: '總覽' },
  { href: '/hardware', label: '硬體管理', short: '硬體' },
  { href: '/audit', label: '操作紀錄', short: '紀錄' },
  { href: '/settings', label: '設定', short: '設定' },
]

export default function Nav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/devices/') && pathname !== '/devices/new' : pathname.startsWith(href)

  return (
    <nav className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3 sm:gap-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-gray-900 shrink-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-600 text-white text-[10px] font-bold">LAB</span>
          <span className="hidden lg:inline">Lab 系統管理</span>
        </Link>
        <div className="flex items-center h-full overflow-x-auto no-scrollbar min-w-0">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className={`relative h-full flex items-center px-2 sm:px-3 text-sm whitespace-nowrap transition-colors ${
                isActive(l.href) ? 'text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-800'
              }`}>
              <span className="sm:hidden">{l.short}</span>
              <span className="hidden sm:inline">{l.label}</span>
              {isActive(l.href) && <span className="absolute inset-x-2 sm:inset-x-3 bottom-0 h-0.5 bg-blue-600 rounded-full" />}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <OperatorPicker />
          <Link href="/devices/new" title="新增設備"
            className="px-2.5 sm:px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            +<span className="hidden sm:inline"> 新增設備</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
