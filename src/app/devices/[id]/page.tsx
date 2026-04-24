'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Device } from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import PingBadge from '@/components/PingBadge'
import ReservationSection from '@/components/ReservationSection'
import IncidentSection from '@/components/IncidentSection'
import BorrowHistorySection from '@/components/BorrowHistorySection'
import HardwareHistorySection from '@/components/HardwareHistorySection'
import SyncLogSection from '@/components/SyncLogSection'

type PingStatus = 'unknown' | 'checking' | 'online' | 'offline'
type SyncState = 'idle' | 'syncing' | 'ok' | 'error'

const fmt = (d: string | null) => {
  if (!d) return '—'
  const date = new Date(d)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

function UnipasswordField({ value }: { value: string }) {
  const [show, setShow] = useState(false)
  if (!value) return <span className="text-gray-400">—</span>
  return (
    <span className="flex items-center gap-2">
      <span className="font-mono">{show ? value : '••••••••'}</span>
      <button onClick={() => setShow(s => !s)} className="text-xs text-blue-500 hover:text-blue-700">
        {show ? '隱藏' : '顯示'}
      </button>
    </span>
  )
}

function InlineField({
  deviceId, field, value, type = 'text', mono, onSaved,
}: {
  deviceId: number; field: string; value: string | null; type?: 'text' | 'date'; mono?: boolean; onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function startEdit() {
    setVal(type === 'date' && value ? value.slice(0, 10) : (value || ''))
    setEditing(true)
  }

  async function save() {
    let sendVal: string | null = val || null
    if (type === 'date' && val) sendVal = new Date(val).toISOString()
    await fetch(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: sendVal }),
    })
    setEditing(false)
    onSaved()
  }

  if (editing) return (
    <input
      ref={inputRef}
      type={type}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
      className="border border-blue-400 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  )

  return (
    <span
      onClick={startEdit}
      className={`cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded px-1 -mx-1 py-0.5 text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}
      title="點擊編輯"
    >
      {type === 'date' ? fmt(value) : (value || <span className="text-gray-400">—</span>)}
    </span>
  )
}

function InlineStateSelect({ deviceId, value, states, onSaved }: {
  deviceId: number; value: string; states: string[]; onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => { if (editing) selectRef.current?.focus() }, [editing])

  async function save(newVal: string) {
    await fetch(`/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemState: newVal }),
    })
    setEditing(false)
    onSaved()
  }

  if (editing) return (
    <select
      ref={selectRef}
      defaultValue={value}
      onChange={e => save(e.target.value)}
      onBlur={() => setEditing(false)}
      className="border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {states.map(s => <option key={s}>{s}</option>)}
    </select>
  )

  return (
    <span onClick={() => setEditing(true)} className="cursor-pointer" title="點擊編輯狀態">
      <StatusBadge state={value} />
    </span>
  )
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [device, setDevice] = useState<Device | null>(null)
  const [states, setStates] = useState<string[]>([])
  const [ipPing, setIpPing] = useState<PingStatus>('unknown')
  const [bmcPing, setBmcPing] = useState<PingStatus>('unknown')
  const [returning, setReturning] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncError, setSyncError] = useState('')
  const [syncRefresh, setSyncRefresh] = useState(0)

  const load = useCallback(async () => {
    const [res, stateRes] = await Promise.all([fetch(`/api/devices/${id}`), fetch('/api/states')])
    if (res.ok) setDevice(await res.json())
    const stateData = await stateRes.json()
    setStates(stateData.map((s: { name: string }) => s.name))
  }, [id])

  useEffect(() => { load() }, [load])

  async function ping(ip: string, set: (s: PingStatus) => void) {
    if (!ip) return
    set('checking')
    const res = await fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    const data = await res.json()
    set(data.online ? 'online' : 'offline')
  }

  async function returnDevice() {
    if (!confirm('確定歸還此設備？借用資訊將存入紀錄並清空。')) return
    setReturning(true)
    const res = await fetch(`/api/devices/${id}/return`, { method: 'POST' })
    const data = await res.json()
    if (data.nextReservation) {
      const activate = confirm(
        `排程中有待接手的預約：${data.nextReservation.borrower}（${fmt(data.nextReservation.fromDate)}）\n是否立即設為當前借用人？`
      )
      if (activate) {
        await fetch(`/api/devices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...device,
            borrowedBy: data.nextReservation.borrower,
            borrowedSince: new Date().toISOString(),
            borrowUntil: data.nextReservation.toDate,
            borrowReason: data.nextReservation.reason,
          }),
        })
        await fetch(`/api/reservations/${data.nextReservation.id}`, { method: 'DELETE' })
      }
    }
    setReturning(false)
    load()
  }

  async function syncDevice() {
    if (!device?.bmcIp) return
    setSyncState('syncing')
    setSyncError('')
    try {
      const res = await fetch(`/api/devices/${id}/sync`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '失敗')
      }
      setSyncState('ok')
      setTimeout(() => setSyncState('idle'), 3000)
      setSyncRefresh(r => r + 1)
      load()
    } catch (err) {
      setSyncState('error')
      setSyncError(err instanceof Error ? err.message : '失敗')
    }
  }

  async function deleteDevice() {
    if (!confirm(`確定刪除 ${device?.name}？此操作無法復原。`)) return
    await fetch(`/api/devices/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  if (!device) return <div className="text-gray-400 py-10 text-center">載入中...</div>

  const row = (label: string, value: string) => (
    <div key={label}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value || '—'}</dd>
    </div>
  )

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
          <h1 className="text-xl font-bold text-gray-900">{device.name}</h1>
          <InlineStateSelect deviceId={device.id} value={device.systemState} states={states} onSaved={load} />
        </div>
        <div className="flex gap-2">
          <Link href={`/devices/${id}/edit`}
            className="px-3 py-1.5 bg-white text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50">
            編輯
          </Link>
          <button onClick={deleteDevice}
            className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded-md border border-red-200 hover:bg-red-100">
            刪除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">基本資訊</h2>
          <dl className="grid grid-cols-2 gap-4">
            {row('負責 PM', device.pmName)}
            {row('負責 SE', device.seName)}
            {row('位置', device.location)}
            {row('備註', device.notes)}
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">硬體規格</h2>
            {device.bmcIp && (
              <div className="flex items-center gap-2">
                {syncState === 'error' && (
                  <span className="text-xs text-red-500" title={syncError}>✗ {syncError}</span>
                )}
                {syncState === 'ok' && (
                  <span className="text-xs text-green-600">✓ 已更新</span>
                )}
                <button
                  onClick={syncDevice}
                  disabled={syncState === 'syncing'}
                  className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                >
                  {syncState === 'syncing' ? '抓取中...' : '抓取硬體資訊'}
                </button>
              </div>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {row('CPU', device.cpuInfo)}
            {row('GPU', device.gpuInfo)}
            {row('RAM', device.ramInfo)}
            {row('Storage', device.storageInfo)}
            {row('AOC', device.aocInfo)}
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">網路與韌體</h2>
          <dl className="grid grid-cols-2 gap-4">
            {row('OS 狀態', device.osStatus)}
            <div>
              <dt className="text-xs text-gray-500">IP</dt>
              <dd className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-mono text-gray-900">{device.ip || '—'}</span>
                {device.ip && (
                  <button onClick={() => ping(device.ip, setIpPing)} className="text-xs text-blue-500 hover:text-blue-700">ping</button>
                )}
                <PingBadge status={ipPing} />
              </dd>
            </div>
            {row('BMC MAC', device.bmcMac)}
            <div>
              <dt className="text-xs text-gray-500">BMC IP</dt>
              <dd className="flex items-center gap-2 mt-0.5">
                <InlineField deviceId={device.id} field="bmcIp" value={device.bmcIp} mono onSaved={load} />
                {device.bmcIp && (
                  <button onClick={() => ping(device.bmcIp, setBmcPing)} className="text-xs text-blue-500 hover:text-blue-700">ping</button>
                )}
                <PingBadge status={bmcPing} />
              </dd>
            </div>
            {row('BMC 版本', device.bmcVersion)}
            {row('BIOS 版本', device.biosVersion)}
            {row('S/N', device.serialNumber)}
            <div>
              <dt className="text-xs text-gray-500">Unipassword</dt>
              <dd className="text-sm text-gray-900 mt-0.5">
                <UnipasswordField value={device.unipassword} />
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">借用狀態</h2>
            {device.borrowedBy && (
              <button onClick={returnDevice} disabled={returning}
                className="px-3 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200 hover:bg-green-100 disabled:opacity-50">
                {returning ? '處理中...' : '歸還'}
              </button>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-gray-500">借用人</dt>
              <dd className="mt-0.5"><InlineField deviceId={device.id} field="borrowedBy" value={device.borrowedBy} onSaved={load} /></dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">借用日期</dt>
              <dd className="mt-0.5"><InlineField deviceId={device.id} field="borrowedSince" value={device.borrowedSince} type="date" onSaved={load} /></dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">借用主旨</dt>
              <dd className="mt-0.5"><InlineField deviceId={device.id} field="borrowReason" value={device.borrowReason} onSaved={load} /></dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">借用期限</dt>
              <dd className="mt-0.5"><InlineField deviceId={device.id} field="borrowUntil" value={device.borrowUntil} type="date" onSaved={load} /></dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-500">測試說明</dt>
              <dd className="mt-0.5"><InlineField deviceId={device.id} field="borrowDescription" value={device.borrowDescription} onSaved={load} /></dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <ReservationSection
          deviceId={device.id}
          reservations={device.reservations ?? []}
          onUpdate={load}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <BorrowHistorySection deviceId={device.id} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <HardwareHistorySection deviceId={device.id} refreshKey={syncRefresh} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <SyncLogSection deviceId={device.id} refreshKey={syncRefresh} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <IncidentSection
          deviceId={device.id}
          incidents={device.incidents ?? []}
          onUpdate={load}
        />
      </div>
    </div>
  )
}
