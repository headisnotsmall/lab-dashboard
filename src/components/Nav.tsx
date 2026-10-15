'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: '設備總覽' },
  { href: '/hardware', label: '硬體管理' },
  { href: '/settings', label: '設定' },
]

export default function Nav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/devices/') && pathname !== '/devices/new' : pathname.startsWith(href)

  return (
    <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-gray-900 shrink-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-600 text-white text-xs font-bold">LAB</span>
          <span className="hidden sm:inline">Lab 系統管理</span>
        </Link>
        <div className="flex items-center gap-1 h-full">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className={`relative h-full flex items-center px-3 text-sm transition-colors ${
                isActive(l.href) ? 'text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {l.label}
              {isActive(l.href) && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-blue-600 rounded-full" />}
            </Link>
          ))}
        </div>
        <Link href="/devices/new"
          className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shrink-0">
          + 新增設備
        </Link>
      </div>
    </nav>
  )
}
