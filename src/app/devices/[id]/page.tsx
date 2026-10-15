'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Device } from '@/lib/types'
import { fmtDate, dueLevel, daysUntil } from '@/lib/format'
import { patchDevice, pingHost } from '@/lib/api'
import InlineStatus from '@/components/InlineStatus'
import PingBadge, { PingStatus } from '@/components/PingBadge'
import CopyButton from '@/components/CopyButton'
import ReservationSection from '@/components/ReservationSection'
import IncidentSection from '@/components/IncidentSection'
import BorrowHistorySection from '@/components/BorrowHistorySection'
import HardwareHistorySection from '@/components/HardwareHistorySection'
import SyncLogSection from '@/components/SyncLogSection'

type SyncState = 'idle' | 'syncing' | 'ok' | 'error'
type Tab = 'reservations' | 'borrow' | 'incidents' | 'hardware' | 'sync'

function UnipasswordField({ value }: { value: string }) {
  const [show, setShow] = useState(false)
  if (!value) return <span className="text-gray-400">—</span>
  return (
    <span className="flex items-center gap-1.5">
      <span className="font-mono">{show ? value : '••••••••'}</span>
      <button onClick={() => setShow(s => !s)} className="text-xs text-blue-500 hover:text-blue-700">
        {show ? '隱藏' : '顯示'}
      </button>
      <CopyButton text={value} />
    </span>
  )
}

function InlineField({
  deviceId, field, value, type = 'text', mono, placeholder, onSaved,
}: {
  deviceId: number; field: string; value: string | null; type?: 'text' | 'date'; mono?: boolean; placeholder?: string; onSaved: () => void
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
    setEditing(false)
    const original = type === 'date' && value ? value.slice(0, 10) : (value || '')
    if (val === original) return
    const sendVal: string | null = type === 'date' ? (val ? new Date(val).toISOString() : null) : val
    if (await patchDevice(deviceId, { [field]: sendVal })) onSaved()
  }

  if (editing) return (
    <input
      ref={inputRef}
      type={type}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
      className="w-full border border-blue-400 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  )

  return (
    <button type="button"
      onClick={startEdit}
      className={`group/f w-full text-left flex items-center gap-1 rounded px-1 -mx-1 py-0.5 text-sm text-gray-900 hover:bg-blue-50 hover:text-blue-700 ${mono ? 'font-mono' : ''}`}
      title="點擊編輯"
    >
      <span className="truncate">
        {!value
          ? <span className="text-gray-300">{placeholder ?? '—'}</span>
          : type === 'date' ? fmtDate(value) : value}
      </span>
      <span className="ml-auto text-[11px] text-gray-300 opacity-0 group-hover/f:opacity-100">✎</span>
    </button>
  )
}

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={`min-w-0 ${span2 ? 'col-span-2' : ''}`}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5 break-words">{children}</dd>
    </div>
  )
}

function Card({ title, actions, children, className = '' }: {
  title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <section className={`bg-white rounded-lg border border-gray-200 shadow-sm p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4 min-h-[28px]">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

const text = (v: string) => v || <span className="text-gray-300">—</span>

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [device, setDevice] = useState<Device | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [states, setStates] = useState<string[]>([])
  const [ipPing, setIpPing] = useState<PingStatus>('unknown')
  const [bmcPing, setBmcPing] = useState<PingStatus>('unknown')
  const [returning, setReturning] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncError, setSyncError] = useState('')
  const [syncRefresh, setSyncRefresh] = useState(0)
  const [tab, setTab] = useState<Tab>('reservations')

  const load = useCallback(async () => {
    const [res, stateRes] = await Promise.all([fetch(`/api/devices/${id}`), fetch('/api/states')])
    if (res.ok) setDevice(await res.json())
    else if (res.status === 404) setNotFound(true)
    const stateData = await stateRes.json()
    setStates(stateData.map((s: { name: string }) => s.name))
  }, [id])

  useEffect(() => { load() }, [load])

  async function ping(ip: string, set: (s: PingStatus) => void) {
    if (!ip) return
    set('checking')
    set(await pingHost(ip) ? 'online' : 'offline')
  }

  // 進入頁面自動 ping 一次 BMC / OS IP
  const autoPinged = useRef(false)
  useEffect(() => {
    if (!device || autoPinged.current) return
    autoPinged.current = true
    if (device.bmcIp) ping(device.bmcIp, setBmcPing)
    if (device.ip) ping(device.ip, setIpPing)
  }, [device])

  async function returnDevice() {
    if (!confirm('確定歸還此設備？借用資訊將存入紀錄並清空。')) return
    setReturning(true)
    const res = await fetch(`/api/devices/${id}/return`, { method: 'POST' })
    const data = await res.json()
    if (data.nextReservation) {
      const activate = confirm(
        `排程中有待接手的預約：${data.nextReservation.borrower}（${fmtDate(data.nextReservation.fromDate)}）\n是否立即設為當前借用人？`
      )
      if (activate) {
        await patchDevice(Number(id), {
          borrowedBy: data.nextReservation.borrower,
          borrowedSince: new Date().toISOString(),
          borrowUntil: data.nextReservation.toDate,
          borrowReason: data.nextReservation.reason,
          borrowDescription: data.nextReservation.description,
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
      load()
    } catch (err) {
      setSyncState('error')
      setSyncError(err instanceof Error ? err.message : '失敗')
    }
    // 成功或失敗都會寫 SyncLog，兩種情況都刷新紀錄
    setSyncRefresh(r => r + 1)
  }

  async function deleteDevice() {
    if (!confirm(`確定刪除 ${device?.name}？此操作無法復原。`)) return
    await fetch(`/api/devices/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  if (notFound) return (
    <div className="py-20 text-center space-y-3">
      <p className="text-gray-500">找不到這台設備，可能已被刪除。</p>
      <Link href="/" className="text-sm text-blue-600 hover:underline">← 回設備總覽</Link>
    </div>
  )
  if (!device) return <div className="text-gray-400 py-20 text-center">載入中...</div>

  const level = device.borrowedBy ? dueLevel(device.borrowUntil) : null
  const reservations = device.reservations ?? []
  const incidents = device.incidents ?? []

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'reservations', label: '借用排程', count: reservations.length },
    { key: 'borrow', label: '借用紀錄' },
    { key: 'incidents', label: '事件記錄', count: incidents.length },
    { key: 'hardware', label: '系統資料更新紀錄' },
    { key: 'sync', label: '抓取紀錄' },
  ]

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 設備總覽</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
            <InlineStatus deviceId={device.id} value={device.systemState} states={states} onSaved={load} />
            {device.location && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">📍 {device.location}</span>
            )}
            {device.bmcIp && (
              <a href={`http://${device.bmcIp}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 bg-white px-2 py-0.5 rounded hover:border-blue-300 hover:text-blue-700">
                BMC 管理頁 ↗
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/devices/${id}/edit`}
              className="px-3 py-1.5 bg-white text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50">
              編輯
            </Link>
            <button onClick={deleteDevice}
              className="px-3 py-1.5 bg-white text-red-600 text-sm rounded-md border border-red-200 hover:bg-red-50">
              刪除
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card
          title="借用狀態"
          className={`lg:col-span-3 ${level === 'overdue' ? 'border-red-300 ring-1 ring-red-200' : level === 'soon' ? 'border-orange-300' : ''}`}
          actions={
            <div className="flex items-center gap-2">
              {level === 'overdue' && device.borrowUntil && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">逾期 {-daysUntil(device.borrowUntil)} 天</span>
              )}
              {level === 'soon' && device.borrowUntil && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">剩 {daysUntil(device.borrowUntil)} 天</span>
              )}
              {!device.borrowedBy && (
                <span className="text-xs bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 px-2 py-0.5 rounded-full">可借用</span>
              )}
              {device.borrowedBy && (
                <button onClick={returnDevice} disabled={returning}
                  className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50">
                  {returning ? '處理中...' : '歸還'}
                </button>
              )}
            </div>
          }
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="借用人"><InlineField deviceId={device.id} field="borrowedBy" value={device.borrowedBy} placeholder="點擊填寫借用人" onSaved={load} /></Field>
            <Field label="借用目的"><InlineField deviceId={device.id} field="borrowReason" value={device.borrowReason} onSaved={load} /></Field>
            <Field label="借用日期"><InlineField deviceId={device.id} field="borrowedSince" value={device.borrowedSince} type="date" onSaved={load} /></Field>
            <Field label="借用期限"><InlineField deviceId={device.id} field="borrowUntil" value={device.borrowUntil} type="date" onSaved={load} /></Field>
            <Field label="其他說明" span2><InlineField deviceId={device.id} field="borrowDescription" value={device.borrowDescription} onSaved={load} /></Field>
          </dl>
        </Card>

        <Card title="基本資訊" className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="負責 PM">{text(device.pmName)}</Field>
            <Field label="負責 SE">{text(device.seName)}</Field>
            <Field label="位置"><InlineField deviceId={device.id} field="location" value={device.location} onSaved={load} /></Field>
            <Field label="OS 狀態">{text(device.osStatus)}</Field>
            <Field label="備註" span2><span className="whitespace-pre-wrap">{text(device.notes)}</span></Field>
          </dl>
        </Card>

        <Card
          title="硬體規格"
          className="lg:col-span-3"
          actions={device.bmcIp && (
            <div className="flex items-center gap-2">
              {syncState === 'error' && (
                <span className="text-xs text-red-500 max-w-[240px] truncate" title={syncError}>✗ {syncError}</span>
              )}
              {syncState === 'ok' && <span className="text-xs text-green-600">✓ 已更新</span>}
              <button
                onClick={syncDevice}
                disabled={syncState === 'syncing'}
                className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
              >
                {syncState === 'syncing' ? '抓取中...（最多 2 分鐘）' : '抓取硬體資訊'}
              </button>
            </div>
          )}
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="CPU">{text(device.cpuInfo)}</Field>
            <Field label="GPU">{text(device.gpuInfo)}</Field>
            <Field label="RAM">{text(device.ramInfo)}</Field>
            <Field label="Storage">{text(device.storageInfo)}</Field>
            <Field label="AOC">{text(device.aocInfo)}</Field>
          </dl>
        </Card>

        <Card title="網路與韌體" className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="BMC IP">
              <span className="flex items-center gap-1">
                <span className="min-w-0 flex-1"><InlineField deviceId={device.id} field="bmcIp" value={device.bmcIp} mono onSaved={load} /></span>
                <CopyButton text={device.bmcIp} />
              </span>
              <span className="flex items-center gap-2 mt-0.5">
                <PingBadge status={bmcPing} />
                {device.bmcIp && (
                  <button onClick={() => ping(device.bmcIp, setBmcPing)} className="text-[11px] text-blue-500 hover:text-blue-700">重新 ping</button>
                )}
              </span>
            </Field>
            <Field label="OS IP">
              <span className="flex items-center gap-1">
                <span className="font-mono">{text(device.ip)}</span>
                <CopyButton text={device.ip} />
              </span>
              <span className="flex items-center gap-2 mt-0.5">
                <PingBadge status={ipPing} />
                {device.ip && (
                  <button onClick={() => ping(device.ip, setIpPing)} className="text-[11px] text-blue-500 hover:text-blue-700">重新 ping</button>
                )}
              </span>
            </Field>
            <Field label="BMC MAC"><span className="font-mono text-xs">{text(device.bmcMac)}</span></Field>
            <Field label="S/N">
              <span className="flex items-center gap-1"><span className="font-mono text-xs">{text(device.serialNumber)}</span><CopyButton text={device.serialNumber} /></span>
            </Field>
            <Field label="BMC 版本">{text(device.bmcVersion)}</Field>
            <Field label="BIOS 版本">{text(device.biosVersion)}</Field>
            <Field label="Unipassword" span2><UnipasswordField value={device.unipassword} /></Field>
          </dl>
        </Card>
      </div>

      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex gap-1 px-3 border-b border-gray-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`relative px-3 py-3 text-sm whitespace-nowrap transition-colors ${
                tab === t.key ? 'text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-800'
              }`}>
              {t.label}
              {!!t.count && (
                <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
              )}
              {tab === t.key && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-blue-600 rounded-full" />}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === 'reservations' && <ReservationSection deviceId={device.id} reservations={reservations} onUpdate={load} />}
          {tab === 'borrow' && <BorrowHistorySection deviceId={device.id} />}
          {tab === 'incidents' && <IncidentSection deviceId={device.id} incidents={incidents} onUpdate={load} />}
          {tab === 'hardware' && <HardwareHistorySection deviceId={device.id} refreshKey={syncRefresh} />}
          {tab === 'sync' && <SyncLogSection deviceId={device.id} refreshKey={syncRefresh} />}
        </div>
      </section>
    </div>
  )
}
