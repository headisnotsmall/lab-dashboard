'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Device } from '@/lib/types'
import { SYSTEM_STATES, STATE_STYLES, SystemState } from '@/lib/constants'
import StatusBadge from '@/components/StatusBadge'
import PingBadge from '@/components/PingBadge'

type PingStatus = 'unknown' | 'checking' | 'online' | 'offline'
type PingMap = Record<number, { ip: PingStatus; bmc: PingStatus }>

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [filter, setFilter] = useState('全部')
  const [search, setSearch] = useState('')
  const [pings, setPings] = useState<PingMap>({})
  const [pinging, setPinging] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/devices')
    setDevices(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function pingOne(ip: string): Promise<PingStatus> {
    if (!ip) return 'unknown'
    const res = await fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    const data = await res.json()
    return data.online ? 'online' : 'offline'
  }

  async function pingAll() {
    setPinging(true)
    const init: PingMap = {}
    devices.forEach(d => { init[d.id] = { ip: d.ip ? 'checking' : 'unknown', bmc: d.bmcIp ? 'checking' : 'unknown' } })
    setPings(init)
    await Promise.all(
      devices.map(async d => {
        const [ipStatus, bmcStatus] = await Promise.all([pingOne(d.ip), pingOne(d.bmcIp)])
        setPings(p => ({ ...p, [d.id]: { ip: ipStatus, bmc: bmcStatus } }))
      })
    )
    setPinging(false)
  }

  const counts = SYSTEM_STATES.reduce((acc, s) => ({
    ...acc,
    [s]: devices.filter(d => d.systemState === s).length,
  }), {} as Record<string, number>)

  const filtered = devices.filter(d => {
    const matchState = filter === '全部' || d.systemState === filter
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.operator.toLowerCase().includes(search.toLowerCase()) ||
      d.ip.includes(search)
    return matchState && matchSearch
  })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{devices.length}</div>
          <div className="text-xs text-gray-500 mt-1">總計</div>
        </div>
        {SYSTEM_STATES.map(s => (
          <div key={s} className="bg-white rounded-lg border border-gray-200 p-4 text-center cursor-pointer hover:border-blue-300"
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
            {SYSTEM_STATES.map(s => <option key={s}>{s}</option>)}
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋名稱 / IP / 操作人"
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
                <th className="px-5 py-3 font-medium">設備名稱</th>
                <th className="px-5 py-3 font-medium">狀態</th>
                <th className="px-5 py-3 font-medium">位置</th>
                <th className="px-5 py-3 font-medium">IP</th>
                <th className="px-5 py-3 font-medium">IP狀態</th>
                <th className="px-5 py-3 font-medium">BMC IP</th>
                <th className="px-5 py-3 font-medium">BMC狀態</th>
                <th className="px-5 py-3 font-medium">OS</th>
                <th className="px-5 py-3 font-medium">操作人員</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-5 py-10 text-center text-gray-400">尚無設備</td></tr>
              )}
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/devices/${d.id}`} className="font-medium text-blue-600 hover:text-blue-700">{d.name}</Link>
                  </td>
                  <td className="px-5 py-3"><StatusBadge state={d.systemState} /></td>
                  <td className="px-5 py-3 text-gray-600">{d.location || '—'}</td>
                  <td className="px-5 py-3 font-mono text-gray-700">{d.ip || '—'}</td>
                  <td className="px-5 py-3"><PingBadge status={pings[d.id]?.ip ?? 'unknown'} /></td>
                  <td className="px-5 py-3 font-mono text-gray-700">{d.bmcIp || '—'}</td>
                  <td className="px-5 py-3"><PingBadge status={pings[d.id]?.bmc ?? 'unknown'} /></td>
                  <td className="px-5 py-3 text-gray-600">{d.osStatus || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{d.operator || '—'}</td>
                  <td className="px-5 py-3">
                    <Link href={`/devices/${d.id}/edit`} className="text-gray-400 hover:text-gray-600 text-xs">編輯</Link>
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
