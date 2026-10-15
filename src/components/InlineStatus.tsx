'use client'
import { useEffect, useRef, useState } from 'react'
import StatusBadge from '@/components/StatusBadge'
import { patchDevice } from '@/lib/api'

export default function InlineStatus({ deviceId, value, states, onSaved }: {
  deviceId: number; value: string; states: string[]; onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => { if (editing) selectRef.current?.focus() }, [editing])

  async function save(newVal: string) {
    setEditing(false)
    if (newVal !== value && await patchDevice(deviceId, { systemState: newVal })) onSaved()
  }

  if (editing) return (
    <select
      ref={selectRef}
      defaultValue={value}
      onChange={e => save(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
      className="border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {states.map(s => <option key={s}>{s}</option>)}
    </select>
  )

  return (
    <button type="button" onClick={() => setEditing(true)} title="點擊變更狀態"
      className="group inline-flex items-center gap-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <StatusBadge state={value} />
      <span className="text-[10px] text-gray-300 group-hover:text-gray-500">▾</span>
    </button>
  )
}
