'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Device } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import PingBadge from '@/components/PingBadge'

type PingStatus = 'unknown' | 'checking' | 'online' | 'offline'
type PingMap = Record<number, { bmc: PingStatus }>

function InlineLocation({ deviceId, value, onSaved }: { deviceId: number; value: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    await fetch(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: val }),
    })
    setEditing(false)
    onSaved()
  }

  if (editing) return (
    <input
      ref={inputRef}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
      className="border border-blue-400 rounded px-2 py-0.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  )

  return (
    <span
      onClick={() => { setVal(value); setEditing(true) }}
      className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded px-1 py-0.5 text-gray-600 text-sm"
      title="點擊編輯位置"
    >
      {value || <span className="text-gray-300">點擊新增</span>}
    </span>
  )
}

const fmt = (d: string | null) => {
  if (!d) return '—'
  const date = new Date(d)
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function BorrowUntilCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-300">—</span>
  const now = new Date()
  const due = new Date(value)
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return (
    <span className="flex items-center gap-1">
      <span className="text-red-600 text-sm font-medium">{fmt(value)}</span>
      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">逾期</span>
    </span>
  )
  if (diffDays <= 3) return (
    <span className="flex items-center gap-1">
      <span className="text-orange-500 text-sm font-medium">{fmt(value)}</span>
      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">即將到期</span>
    </span>
  )
  return <span className="text-gray-600 text-sm">{fmt(value)}</span>
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [states, setStates] = useState<string[]>([])
  const [filter, setFilter] = useState('全部')
  const [search, setSearch] = useState('')
  const [pings, setPings] = useState<PingMap>({})
  const [pinging, setPinging] = useState(false)

  const load = useCallback(async () => {
    const [devRes, stateRes] = await Promise.all([fetch('/api/devices'), fetch('/api/states')])
    const [devData, stateData] = await Promise.all([devRes.json(), stateRes.json()])
    setDevices(devData)
    setStates(stateData.map((s: { name: string }) => s.name))
  }, [])

  useEffect(() => { load() }, [load])

  async function pingAll() {
    setPinging(true)
    const init: PingMap = {}
    devices.forEach(d => { init[d.id] = { bmc: d.bmcIp ? 'checking' : 'unknown' } })
    setPings(init)
    await Promise.all(
      devices.map(async d => {
        if (!d.bmcIp) return
        const res = await fetch('/api/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: d.bmcIp }),
        })
        const data = await res.json()
        setPings(p => ({ ...p, [d.id]: { bmc: data.online ? 'online' : 'offline' } }))
      })
    )
    setPinging(false)
  }

  const counts = states.reduce((acc, s) => ({
    ...acc,
    [s]: devices.filter(d => d.systemState === s).length,
  }), {} as Record<string, number>)

  const filtered = devices.filter(d => {
    const matchState = filter === '全部' || d.systemState === filter
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.operator.toLowerCase().includes(search.toLowerCase()) ||
      d.bmcIp.includes(search)
    return matchState && matchSearch
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center min-w-[80px]">
          <div className="text-2xl font-bold text-gray-900">{devices.length}</div>
          <div className="text-xs text-gray-500 mt-1">總計</div>
        </div>
        {states.map(s => (
          <div key={s} className={`bg-white rounded-lg border p-4 text-center min-w-[80px] cursor-pointer transition-colors ${filter === s ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
            onClick={() => setFilter(filter === s ? '全部' : s)}>
            <div className="text-2xl font-bold text-gray-900">{counts[s] ?? 0}</div>
            <div className="mt-1"><StatusBadge state={s} /></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>全部</option>
            {states.map(s => <option key={s}>{s}</option>)}
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋名稱 / BMC IP / 操作人"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={pingAll} disabled={pinging || devices.length === 0}
            className="ml-auto px-3 py-1.5 bg-white text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
            {pinging ? '檢查中...' : '重新整理 Ping'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
                <th className="px-4 py-3 font-medium">設備名稱</th>
                <th className="px-4 py-3 font-medium">狀態</th>
                <th className="px-4 py-3 font-medium">BMC IP</th>
                <th className="px-4 py-3 font-medium">BMC狀態</th>
                <th className="px-4 py-3 font-medium">操作人員</th>
                <th className="px-4 py-3 font-medium">借用期限</th>
                <th className="px-4 py-3 font-medium">使用原因</th>
                <th className="px-4 py-3 font-medium">後續預約</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-gray-400">尚無設備</td></tr>
              )}

              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/devices/${d.id}`} className="font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap">{d.name}</Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge state={d.systemState} /></td>
                  <td className="px-4 py-3 font-mono text-gray-700 text-xs">{d.bmcIp || '—'}</td>
                  <td className="px-4 py-3"><PingBadge status={pings[d.id]?.bmc ?? 'unknown'} /></td>
                  <td className="px-4 py-3 text-gray-600">{d.operator || '—'}</td>
                  <td className="px-4 py-3"><BorrowUntilCell value={d.borrowUntil ?? null} /></td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px]">
                    <span className="block truncate">{d.borrowReason || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {d.reservations && d.reservations[0] ? (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        {d.reservations[0].borrower}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
