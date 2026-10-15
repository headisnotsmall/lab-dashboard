'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Device } from '@/lib/types'
import { fmtDate, dueLevel } from '@/lib/format'
import { apiFetch, patchDevice, pingHost, runPool } from '@/lib/api'
import { stateDot } from '@/components/StatusBadge'
import InlineStatus from '@/components/InlineStatus'
import PingBadge, { PingStatus } from '@/components/PingBadge'
import CopyButton from '@/components/CopyButton'
import DeviceName from '@/components/DeviceName'
import { splitDeviceName, shortModel } from '@/lib/model'

type PingMap = Record<number, PingStatus>
type SortKey = 'name' | 'systemState' | 'borrowedBy' | 'borrowUntil'
// 狀態篩選用狀態名稱；以下兩個是額外的快速篩選
const F_ALL = '全部'
const F_BORROWED = '__borrowed'
const F_DUE = '__due'

function InlineLocation({ deviceId, value, onSaved }: { deviceId: number; value: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    setEditing(false)
    if (val !== value && await patchDevice(deviceId, { location: val })) onSaved()
  }

  if (editing) return (
    <input
      ref={inputRef}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      className="mt-0.5 border border-blue-400 rounded px-1.5 py-0.5 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  )

  return (
    <button type="button"
      onClick={() => { setVal(value); setEditing(true) }}
      className="block mt-0.5 text-left text-xs rounded px-0.5 -mx-0.5 hover:bg-blue-50 hover:text-blue-700 text-gray-400"
      title="點擊編輯位置"
    >
      {value || <span className="text-gray-300 opacity-0 group-hover:opacity-100">+ 位置</span>}
    </button>
  )
}

function BorrowUntilCell({ value }: { value: string | null }) {
  const level = dueLevel(value)
  if (!level) return <span className="text-gray-300">—</span>
  if (level === 'overdue') return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-red-600 font-medium">{fmtDate(value)}</span>
      <span className="text-[11px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">逾期</span>
    </span>
  )
  if (level === 'soon') return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-orange-600 font-medium">{fmtDate(value)}</span>
      <span className="text-[11px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">即將到期</span>
    </span>
  )
  return <span className="text-gray-600 whitespace-nowrap">{fmtDate(value)}</span>
}

function StatCard({ label, count, active, onClick, accent, dot }: {
  label: string; count: number; active: boolean; onClick: () => void; accent?: string; dot?: string
}) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left bg-surface rounded-lg border px-4 py-3 min-w-[96px] transition-all ${
        active ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
        {label}
      </div>
      <div className={`text-2xl font-semibold mt-1 tabular-nums ${accent ?? 'text-gray-900'}`}>{count}</div>
    </button>
  )
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [states, setStates] = useState<string[]>([])
  const [filter, setFilter] = useState(F_ALL)
  const [model, setModel] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'name', asc: true })
  const [pings, setPings] = useState<PingMap>({})
  const [pinging, setPinging] = useState(false)
  const [lastPing, setLastPing] = useState<Date | null>(null)
  const autoPinged = useRef(false)

  const load = useCallback(async () => {
    const [devRes, stateRes] = await Promise.all([apiFetch('/api/devices'), apiFetch('/api/states')])
    const [devData, stateData] = await Promise.all([devRes.json(), stateRes.json()])
    setDevices(devData)
    setStates(stateData.map((s: { name: string }) => s.name))
  }, [])

  useEffect(() => { load() }, [load])

  const pingAll = useCallback(async (list: Device[]) => {
    setPinging(true)
    const init: PingMap = {}
    list.forEach(d => { init[d.id] = d.bmcIp ? 'checking' : 'unknown' })
    setPings(init)
    await runPool(list.filter(d => d.bmcIp), 16, async d => {
      const online = await pingHost(d.bmcIp)
      setPings(p => ({ ...p, [d.id]: online ? 'online' : 'offline' }))
    })
    setPinging(false)
    setLastPing(new Date())
  }, [])

  // 第一次載入完自動 ping 一次，不用再手動按
  useEffect(() => {
    if (devices && !autoPinged.current) {
      autoPinged.current = true
      pingAll(devices)
    }
  }, [devices, pingAll])

  if (!devices) return <div className="text-gray-400 py-20 text-center">載入中...</div>

  const counts = states.reduce((acc, s) => ({
    ...acc,
    [s]: devices.filter(d => d.systemState === s).length,
  }), {} as Record<string, number>)
  const borrowedCount = devices.filter(d => d.borrowedBy).length
  const dueCount = devices.filter(d => d.borrowedBy && dueLevel(d.borrowUntil) && dueLevel(d.borrowUntil) !== 'ok').length

  // 同型號有 2 台以上才出按鈕；一台的型號用搜尋就好
  const modelCounts = new Map<string, number>()
  devices.forEach(d => {
    const m = splitDeviceName(d.name).model
    modelCounts.set(m, (modelCounts.get(m) ?? 0) + 1)
  })
  const models = Array.from(modelCounts.entries())
    .filter(([, n]) => n > 1)
    .sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))

  const q = search.trim().toLowerCase()
  const filtered = devices.filter(d => {
    if (model && splitDeviceName(d.name).model !== model) return false
    const matchFilter =
      filter === F_ALL ? true :
      filter === F_BORROWED ? !!d.borrowedBy :
      filter === F_DUE ? !!d.borrowedBy && (dueLevel(d.borrowUntil) === 'overdue' || dueLevel(d.borrowUntil) === 'soon') :
      d.systemState === filter
    if (!matchFilter) return false
    if (!q) return true
    return [d.name, d.borrowedBy, d.bmcIp, d.location, d.borrowReason]
      .some(v => (v || '').toLowerCase().includes(q))
  })

  const sorted = [...filtered].sort((a, b) => {
    const dir = sort.asc ? 1 : -1
    if (sort.key === 'borrowUntil') {
      // 沒有期限的永遠排在最後
      if (!a.borrowUntil) return 1
      if (!b.borrowUntil) return -1
      return (new Date(a.borrowUntil).getTime() - new Date(b.borrowUntil).getTime()) * dir
    }
    if (sort.key === 'systemState') return (states.indexOf(a.systemState) - states.indexOf(b.systemState)) * dir
    const av = a[sort.key] || '', bv = b[sort.key] || ''
    if (!av) return 1
    if (!bv) return -1
    return av.localeCompare(bv, 'zh-Hant', { numeric: true }) * dir
  })

  const toggleFilter = (f: string) => setFilter(cur => cur === f ? F_ALL : f)
  const toggleSort = (key: SortKey) => setSort(s => ({ key, asc: s.key === key ? !s.asc : true }))

  const sortTh = (k: SortKey, children: React.ReactNode) => (
    <th className="px-4 py-2.5 font-medium">
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-gray-800">
        {children}
        <span className={sort.key === k ? 'text-blue-600' : 'text-gray-300'}>{sort.key === k && !sort.asc ? '↓' : '↑'}</span>
      </button>
    </th>
  )

  const onlineCount = Object.values(pings).filter(p => p === 'online').length
  const offlineCount = Object.values(pings).filter(p => p === 'offline').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        <StatCard label="總計" count={devices.length} active={filter === F_ALL} onClick={() => setFilter(F_ALL)} />
        {states.map(s => (
          <StatCard key={s} label={s} count={counts[s] ?? 0} dot={stateDot(s)}
            active={filter === s} onClick={() => toggleFilter(s)} />
        ))}
        <div className="hidden md:block w-px bg-gray-200 mx-1" />
        <StatCard label="借用中" count={borrowedCount} active={filter === F_BORROWED} onClick={() => toggleFilter(F_BORROWED)} />
        <StatCard label="逾期 / 即將到期" count={dueCount} active={filter === F_DUE} onClick={() => toggleFilter(F_DUE)}
          accent={dueCount > 0 ? 'text-red-600' : undefined} dot={dueCount > 0 ? 'bg-red-500' : undefined} />
      </div>

      <div className="bg-surface rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setSearch('') }}
              placeholder="搜尋名稱 / BMC IP / 借用人 / 位置"
              className="border border-gray-300 rounded-md pl-3 pr-7 py-1.5 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
            )}
          </div>
          {filter !== F_ALL && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
              篩選：{filter === F_BORROWED ? '借用中' : filter === F_DUE ? '逾期 / 即將到期' : filter}
              <button onClick={() => setFilter(F_ALL)} className="hover:text-blue-900">✕</button>
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {lastPing && !pinging && (
              <span className="text-xs text-gray-400 hidden sm:inline">
                BMC <span className="text-green-600">{onlineCount} 在線</span>
                {offlineCount > 0 && <> · <span className="text-red-500">{offlineCount} 離線</span></>}
                {' '}· {lastPing.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={() => pingAll(devices)} disabled={pinging || devices.length === 0}
              className="px-3 py-1.5 bg-surface text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
              {pinging ? '檢查中...' : '重新 Ping'}
            </button>
          </div>
        </div>

        {models.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs text-gray-400 shrink-0">型號</span>
            {models.map(([m, n]) => (
              <button key={m} type="button" title={m} onClick={() => setModel(cur => cur === m ? '' : m)}
                className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  model === m
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-surface border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                {shortModel(m)}
                <span className={`tabular-nums ${model === m ? 'text-blue-100' : 'text-gray-400'}`}>{n}</span>
              </button>
            ))}
          </div>
        )}

        {/* 手機：卡片列表 */}
        <ul className="md:hidden divide-y divide-gray-100">
          {sorted.length === 0 && <li className="px-4 py-10 text-center text-gray-400 text-sm">沒有符合的設備</li>}
          {sorted.map(d => {
            const level = d.borrowedBy ? dueLevel(d.borrowUntil) : null
            const next = d.reservations?.[0]
            return (
              <li key={d.id} className={`px-4 py-3 border-l-2 ${level === 'overdue' ? 'border-red-400 bg-red-50/40' : level === 'soon' ? 'border-orange-300' : 'border-transparent'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/devices/${d.id}`} className="font-medium text-blue-600 break-all"><DeviceName name={d.name} /></Link>
                    {d.location && <div className="text-xs text-gray-400">{d.location}</div>}
                  </div>
                  <InlineStatus deviceId={d.id} value={d.systemState} states={states} onSaved={load} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-gray-400 shrink-0">BMC</span>
                    {d.bmcIp
                      ? <><a href={`http://${d.bmcIp}`} target="_blank" rel="noopener noreferrer" className="font-mono text-gray-700 truncate">{d.bmcIp}</a><PingBadge status={pings[d.id] ?? 'unknown'} /></>
                      : <span className="text-gray-300">—</span>}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-gray-400 shrink-0">借用</span>
                    <span className="text-gray-700 truncate">{d.borrowedBy || '—'}</span>
                  </div>
                  {d.borrowedBy && (
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className="text-gray-400 shrink-0">期限</span>
                      <BorrowUntilCell value={d.borrowUntil ?? null} />
                    </div>
                  )}
                  {d.borrowReason && <div className="col-span-2 text-gray-500 truncate">{d.borrowReason}</div>}
                  {next && (
                    <div className="col-span-2 text-amber-700">
                      下一位：{next.borrower}（{fmtDate(next.fromDate)} ~ {fmtDate(next.toDate)}）
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                {sortTh('name', '設備')}
                {sortTh('systemState', '狀態')}
                <th className="px-4 py-2.5 font-medium">BMC</th>
                {sortTh('borrowedBy', '借用人')}
                {sortTh('borrowUntil', '借用期限')}
                <th className="px-4 py-2.5 font-medium">借用目的</th>
                <th className="px-4 py-2.5 font-medium">後續預約</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  {devices.length === 0
                    ? <>尚無設備，<Link href="/devices/new" className="text-blue-600 hover:underline">新增第一台</Link></>
                    : '沒有符合的設備'}
                </td></tr>
              )}

              {sorted.map(d => {
                const level = d.borrowedBy ? dueLevel(d.borrowUntil) : null
                const next = d.reservations?.[0]
                return (
                  <tr key={d.id} className={`group hover:bg-gray-50 ${level === 'overdue' ? 'bg-red-50/40' : ''}`}>
                    <td className={`px-4 py-2.5 border-l-2 ${level === 'overdue' ? 'border-red-400' : level === 'soon' ? 'border-orange-300' : 'border-transparent'}`}>
                      <Link href={`/devices/${d.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"><DeviceName name={d.name} /></Link>
                      <InlineLocation deviceId={d.id} value={d.location} onSaved={load} />
                    </td>
                    <td className="px-4 py-2.5"><InlineStatus deviceId={d.id} value={d.systemState} states={states} onSaved={load} /></td>
                    <td className="px-4 py-2.5">
                      {d.bmcIp ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-0.5">
                            <a href={`http://${d.bmcIp}`} target="_blank" rel="noopener noreferrer"
                              className="font-mono text-xs text-gray-700 hover:text-blue-700 hover:underline">{d.bmcIp}</a>
                            <CopyButton text={d.bmcIp} className="opacity-0 group-hover:opacity-100" />
                          </span>
                          <PingBadge status={pings[d.id] ?? 'unknown'} />
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{d.borrowedBy || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5"><BorrowUntilCell value={d.borrowUntil ?? null} /></td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[220px]">
                      <span className="block truncate" title={d.borrowReason}>{d.borrowReason || <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {next ? (
                        <div className="flex flex-col gap-0.5" title={next.reason}>
                          <span className="text-xs text-amber-800 bg-amber-50 ring-1 ring-inset ring-amber-600/20 px-2 py-0.5 rounded-full w-fit">
                            {next.borrower}
                          </span>
                          <span className="text-[11px] text-gray-400 pl-1 whitespace-nowrap">
                            {fmtDate(next.fromDate)} ~ {fmtDate(next.toDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
          顯示 {sorted.length} / {devices.length} 台
        </div>
      </div>
    </div>
  )
}
