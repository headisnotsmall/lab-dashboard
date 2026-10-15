'use client'

export type PingStatus = 'unknown' | 'checking' | 'online' | 'offline'

export default function PingBadge({ status }: { status: PingStatus }) {
  if (status === 'unknown') return <span className="text-gray-300 text-xs">—</span>
  if (status === 'checking') return (
    <span className="inline-flex items-center gap-1 text-gray-400 text-xs whitespace-nowrap">
      <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> 檢查中
    </span>
  )
  if (status === 'online') return (
    <span className="inline-flex items-center gap-1 text-green-600 text-xs whitespace-nowrap">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> 在線
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-red-500 text-xs whitespace-nowrap">
      <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> 離線
    </span>
  )
}
