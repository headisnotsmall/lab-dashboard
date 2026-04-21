'use client'
import { STATE_STYLES, SystemState } from '@/lib/constants'

export default function StatusBadge({ state }: { state: string }) {
  const style = STATE_STYLES[state as SystemState] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {state}
    </span>
  )
}
