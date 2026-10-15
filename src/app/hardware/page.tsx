'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Device } from '@/lib/types'
import { apiFetch, runPool } from '@/lib/api'
import { fmtDate, fmtDateTime } from '@/lib/format'

const ALL_COLUMNS: { label: string; field: keyof Device }[] = [
  { label: 'CPU',      field: 'cpuInfo' },
  { label: 'RAM',      field: 'ramInfo' },
  { label: 'GPU',      field: 'gpuInfo' },
  { label: 'Storage',  field: 'storageInfo' },
  { label: 'AOC',      field: 'aocInfo' },
  { label: 'OS',       field: 'osStatus' },
  { label: 'BMC 版本', field: 'bmcVersion' },
  { label: 'BIOS 版本',field: 'biosVersion' },
  { label: 'S/N',      field: 'serialNumber' },
  { label: 'BMC MAC',  field: 'bmcMac' },
  { label: 'IP',       field: 'ip' },
  { label: 'BMC IP',   field: 'bmcIp' },
  { label: '負責 PM',  field: 'pmName' },
  { label: '負責 SE',  field: 'seName' },
]

const STORAGE_KEY = 'hardware-page-columns'
const DEFAULT_FIELDS = ['cpuInfo', 'ramInfo', 'gpuInfo', 'storageInfo', 'aocInfo', 'osStatus', 'bmcVersion', 'biosVersion']

function loadSavedFields(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set(DEFAULT_FIELDS)
}

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
    await apiFetch(`/api/devices/${deviceId}`, {
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

interface AutoSyncStatus {
  enabled: boolean; intervalDays: number; running: boolean
  lastRunAt: string | null; nextRunAt: string | null
}

function LastSync({ log }: { log?: NonNullable<Device['syncLogs']>[number] }) {
  if (!log) return <span className="text-[11px] text-gray-300">未同步過</span>
  const label = log.status === 'success' ? '✓' : log.status === 'offline' ? '失聯' : '✗'
  const color = log.status === 'success' ? 'text-green-600' : log.status === 'offline' ? 'text-gray-500' : 'text-red-500'
  return (
    <span className="text-[11px] text-gray-400 whitespace-nowrap" title={log.errorMessage || undefined}>
      {fmtDate(log.createdAt).slice(5)} {log.source === 'auto' ? '自動' : '手動'} <span className={color}>{label}</span>
    </span>
  )
}

export default function HardwarePage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [search, setSearch] = useState('')
  const [syncStates, setSyncStates] = useState<Record<number, SyncState>>({})
  const [syncError, setSyncError] = useState<Record<number, string>>({})
  const [autoSync, setAutoSync] = useState<AutoSyncStatus | null>(null)
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null)
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set(DEFAULT_FIELDS))
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const colMenuRef = useRef<HTMLDivElement>(null)

  // Load saved column selection after mount (localStorage not available during SSR)
  useEffect(() => { setVisibleFields(loadSavedFields()) }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false)
      }
    }
    if (colMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colMenuOpen])

  function toggleField(field: string) {
    setVisibleFields(prev => {
      const next = new Set(prev)
      next.has(field) ? next.delete(field) : next.add(field)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      return next
    })
  }

  const COLUMNS = ALL_COLUMNS.filter(c => visibleFields.has(c.field))

  const load = useCallback(async () => {
    const [res, auto] = await Promise.all([apiFetch('/api/devices'), apiFetch('/api/auto-sync')])
    setDevices(await res.json())
    setAutoSync(await auto.json())
  }, [])

  useEffect(() => { load() }, [load])

  function handleSaved(deviceId: number, field: string, val: string) {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, [field]: val } : d))
  }

  const filtered = devices.filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return Object.values(d).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
  })

  async function syncDevice(id: number) {
    setSyncStates(s => ({ ...s, [id]: 'syncing' }))
    setSyncError(e => { const n = { ...e }; delete n[id]; return n })
    try {
      const res = await apiFetch(`/api/devices/${id}/sync`, { method: 'POST' })
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

  // SAA 每台最多跑 120 秒，一次全部打出去容易塞爆，限制同時 4 台
  async function syncAll() {
    const targets = filtered.filter(d => d.bmcIp)
    if (!confirm(`將透過 SAA 同步 ${targets.length} 台設備，可能需要幾分鐘，確定繼續？`)) return
    setSyncProgress({ done: 0, total: targets.length })
    await runPool(targets, 4, async d => {
      await syncDevice(d.id)
      setSyncProgress(p => p && { ...p, done: p.done + 1 })
    })
    setSyncProgress(null)
  }


  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">硬體管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">點擊格子直接編輯，或透過 SAA 同步</p>
          {autoSync && (
            <p className="text-xs text-gray-400 mt-1">
              {autoSync.enabled
                ? <>自動同步：每 {autoSync.intervalDays} 天 · 上次 {fmtDateTime(autoSync.lastRunAt)} · 下次 {fmtDateTime(autoSync.nextRunAt)}{autoSync.running && <span className="text-blue-600"> · 執行中…</span>}</>
                : '自動同步：已關閉'}
              {' '}<Link href="/settings" className="text-blue-500 hover:underline">設定</Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋任何欄位"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Column selector */}
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setColMenuOpen(o => !o)}
              className="px-3 py-1.5 bg-surface text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50 whitespace-nowrap"
            >
              欄位 {colMenuOpen ? '▲' : '▼'}
            </button>
            {colMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-surface border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {ALL_COLUMNS.map(c => (
                  <label key={c.field} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={visibleFields.has(c.field)}
                      onChange={() => toggleField(c.field)}
                      className="rounded"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={syncAll}
            disabled={!!syncProgress || filtered.every(d => !d.bmcIp)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {syncProgress ? `同步中 ${syncProgress.done}/${syncProgress.total}` : search ? '同步篩選結果' : '全部同步'}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-gray-200 shadow-sm overflow-auto max-h-[calc(100vh-180px)]">
        <table className="text-sm w-full">
          <thead>
            <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
              <th className="px-4 py-3 font-medium sticky left-0 bg-gray-50 z-30 border-r border-gray-200 min-w-[160px]">設備名稱</th>
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
                  <td className="px-4 py-2 sticky left-0 bg-surface group-hover:bg-gray-50 z-10 border-r border-gray-100">
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
                        {state === 'idle' && <LastSync log={d.syncLogs?.[0]} />}
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
