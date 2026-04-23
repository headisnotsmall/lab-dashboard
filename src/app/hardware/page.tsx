'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Device } from '@/lib/types'

const COLUMNS: { label: string; field: keyof Device }[] = [
  { label: 'CPU',      field: 'cpuInfo' },
  { label: 'RAM',      field: 'ramInfo' },
  { label: 'GPU',      field: 'gpuInfo' },
  { label: 'Storage',  field: 'storageInfo' },
  { label: 'AOC',      field: 'aocInfo' },
  { label: 'OS',       field: 'osStatus' },
  { label: 'BMC 版本', field: 'bmcVersion' },
  { label: 'BIOS 版本',field: 'biosVersion' },
]

function InlineCell({
  deviceId, field, value, onSaved,
}: {
  deviceId: number; field: string; value: string; onSaved: (field: string, value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setVal(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    if (val === value) { setEditing(false); return }
    await fetch(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: val }),
    })
    setEditing(false)
    onSaved(field, val)
  }

  if (editing) return (
    <input
      ref={inputRef}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') { setVal(value); setEditing(false) }
      }}
      className="w-full border border-blue-400 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
    />
  )

  return (
    <span
      onClick={() => setEditing(true)}
      className="block cursor-pointer rounded px-1 py-0.5 hover:bg-blue-50 hover:text-blue-700 text-xs text-gray-600 min-h-[22px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]"
      title={value || '點擊編輯'}
    >
      {value || <span className="text-gray-300">—</span>}
    </span>
  )
}

type SyncState = 'idle' | 'syncing' | 'ok' | 'error'

export default function HardwarePage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [search, setSearch] = useState('')
  const [syncStates, setSyncStates] = useState<Record<number, SyncState>>({})
  const [syncError, setSyncError] = useState<Record<number, string>>({})
  const [syncingAll, setSyncingAll] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/devices')
    setDevices(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  function handleSaved(deviceId: number, field: string, val: string) {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, [field]: val } : d))
  }

  async function syncDevice(id: number) {
    setSyncStates(s => ({ ...s, [id]: 'syncing' }))
    setSyncError(e => { const n = { ...e }; delete n[id]; return n })
    try {
      const res = await fetch(`/api/devices/${id}/sync`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '同步失敗')
      setDevices(prev => prev.map(d => d.id === id ? { ...d, ...data.updates } : d))
      setSyncStates(s => ({ ...s, [id]: 'ok' }))
      setTimeout(() => setSyncStates(s => ({ ...s, [id]: 'idle' })), 3000)
    } catch (err) {
      setSyncStates(s => ({ ...s, [id]: 'error' }))
      setSyncError(e => ({ ...e, [id]: err instanceof Error ? err.message : '失敗' }))
    }
  }

  async function syncAll() {
    setSyncingAll(true)
    const hasBmc = devices.filter(d => d.bmcIp)
    await Promise.all(hasBmc.map(d => syncDevice(d.id)))
    setSyncingAll(false)
  }

  const filtered = devices.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">硬體管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">點擊格子直接編輯，或透過 SAA 自動同步</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋設備名稱 / 位置"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={syncAll}
            disabled={syncingAll || devices.every(d => !d.bmcIp)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {syncingAll ? '同步中...' : '全部同步'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="text-sm w-full">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 font-medium sticky left-0 bg-gray-50 z-10 border-r border-gray-200 min-w-[160px]">設備名稱</th>
              {COLUMNS.map(c => (
                <th key={c.field} className="px-4 py-3 font-medium whitespace-nowrap">{c.label}</th>
              ))}
              <th className="px-4 py-3 font-medium">同步</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="px-5 py-10 text-center text-gray-400">
                  {devices.length === 0 ? '尚無設備' : '沒有符合的結果'}
                </td>
              </tr>
            )}
            {filtered.map(d => {
              const state = syncStates[d.id] ?? 'idle'
              return (
                <tr key={d.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100">
                    <Link href={`/devices/${d.id}`} className="font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap text-sm">
                      {d.name}
                    </Link>
                    {d.location && <div className="text-xs text-gray-400 mt-0.5">{d.location}</div>}
                  </td>
                  {COLUMNS.map(c => (
                    <td key={c.field} className="px-3 py-2">
                      <InlineCell
                        deviceId={d.id}
                        field={c.field}
                        value={d[c.field] as string}
                        onSaved={(field, val) => handleSaved(d.id, field, val)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {!d.bmcIp ? (
                      <span className="text-xs text-gray-300">無 BMC IP</span>
                    ) : (
                      <div className="flex flex-col items-start gap-0.5">
                        <button
                          onClick={() => syncDevice(d.id)}
                          disabled={state === 'syncing'}
                          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                        >
                          {state === 'syncing' ? '同步中...' : '同步'}
                        </button>
                        {state === 'ok' && <span className="text-xs text-green-600">✓ 已更新</span>}
                        {state === 'error' && (
                          <span className="text-xs text-red-500 max-w-[160px] block leading-tight">
                            ✗ {syncError[d.id] || '失敗'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} 台設備</p>
    </div>
  )
}
