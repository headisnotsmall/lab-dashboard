'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuditLog } from '@/lib/types'
import { apiFetch } from '@/lib/api'
import { fmtDateTime } from '@/lib/format'

const ACTION_STYLES: Record<string, string> = {
  '刪除設備': 'bg-red-100 text-red-700',
  '新增設備': 'bg-green-100 text-green-700',
  '歸還': 'bg-green-100 text-green-700',
  '推送預約': 'bg-blue-100 text-blue-700',
  '合併借用人': 'bg-amber-100 text-amber-700',
  '自動同步硬體資訊': 'bg-purple-100 text-purple-700',
}

export default function AuditLogList({ deviceId, showDevice, refreshKey }: {
  deviceId?: number; showDevice?: boolean; refreshKey?: number
}) {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [operator, setOperator] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const params = new URLSearchParams({ limit: deviceId ? '200' : '500' })
    if (deviceId) params.set('deviceId', String(deviceId))
    apiFetch(`/api/audit?${params}`).then(r => r.json()).then(setLogs)
  }, [deviceId, refreshKey])

  if (!logs) return <p className="text-sm text-gray-400">載入中...</p>

  const operators = Array.from(new Set(logs.map(l => l.operator))).filter(Boolean)
  const query = q.trim().toLowerCase()
  const filtered = logs.filter(l =>
    (!operator || l.operator === operator) &&
    (!query || [l.deviceName, l.action, l.detail, l.operator].some(v => v.toLowerCase().includes(query))))

  return (
    <div className="space-y-3">
      {!deviceId && (
        <div className="flex flex-wrap gap-2">
          <select value={operator} onChange={e => setOperator(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">所有操作者</option>
            {operators.map(o => <option key={o}>{o}</option>)}
          </select>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋設備 / 動作 / 內容"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">尚無操作紀錄</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {filtered.map(l => (
            <li key={l.id} className="py-2.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <div className="sm:w-36 shrink-0 text-xs text-gray-400 tabular-nums pt-0.5">{fmtDateTime(l.createdAt)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium text-gray-900">{l.operator || '未具名'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${ACTION_STYLES[l.action] ?? 'bg-gray-100 text-gray-700'}`}>{l.action}</span>
                  {showDevice && l.deviceName && (
                    l.deviceId
                      ? <Link href={`/devices/${l.deviceId}`} className="text-blue-600 hover:underline">{l.deviceName}</Link>
                      : <span className="text-gray-500">{l.deviceName}</span>
                  )}
                </div>
                {l.detail && <p className="text-xs text-gray-500 mt-1 whitespace-pre-line break-words">{l.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
