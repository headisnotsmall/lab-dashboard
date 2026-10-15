'use client'
import { STATE_STYLES, STATE_DOTS, SystemState } from '@/lib/constants'

// 設定頁自訂的狀態沒有預設顏色，用名稱 hash 挑一個，確保同名稱永遠同色
const FALLBACK = [
  { badge: 'bg-teal-100 text-teal-800 ring-teal-600/20', dot: 'bg-teal-500' },
  { badge: 'bg-pink-100 text-pink-800 ring-pink-600/20', dot: 'bg-pink-500' },
  { badge: 'bg-lime-100 text-lime-800 ring-lime-600/20', dot: 'bg-lime-500' },
  { badge: 'bg-cyan-100 text-cyan-800 ring-cyan-600/20', dot: 'bg-cyan-500' },
  { badge: 'bg-amber-100 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  { badge: 'bg-indigo-100 text-indigo-800 ring-indigo-600/20', dot: 'bg-indigo-500' },
]

function fallback(state: string) {
  let h = 0
  for (const ch of state) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK[h % FALLBACK.length]
}

export function stateStyle(state: string) {
  return STATE_STYLES[state as SystemState] ?? fallback(state).badge
}

export function stateDot(state: string) {
  return STATE_DOTS[state as SystemState] ?? fallback(state).dot
}

export default function StatusBadge({ state }: { state: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap ${stateStyle(state)}`}>
      {state}
    </span>
  )
}
