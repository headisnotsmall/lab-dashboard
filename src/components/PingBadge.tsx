'use client'

type PingStatus = 'unknown' | 'checking' | 'online' | 'offline'

export default function PingBadge({ status }: { status: PingStatus }) {
  if (status === 'unknown') return <span className="text-gray-300 text-sm">—</span>
  if (status === 'checking') return <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
  if (status === 'online') return (
    <span className="flex items-center gap-1 text-green-600 text-xs">
      <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> 在線
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-red-500 text-xs">
      <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> 離線
    </span>
  )
}
