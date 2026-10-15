'use client'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { fmtDateTime } from '@/lib/format'

interface Status {
  enabled: boolean
  intervalDays: number
  hour: number
  running: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  lastSummary: { total: number; success: number; failed: number; offline: number; skipped: number } | null
}

export default function AutoSyncPanel() {
  const [status, setStatus] = useState<Status | null>(null)
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    setStatus(await apiFetch('/api/auto-sync').then(r => r.json()))
  }, [])

  useEffect(() => { load() }, [load])

  // 執行中每 5 秒更新一次狀態
  useEffect(() => {
    if (!status?.running) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [status?.running, load])

  async function runNow() {
    if (!confirm('立即對所有有 BMC IP 的設備跑一輪同步？可能需要幾分鐘。')) return
    setStarting(true)
    const res = await apiFetch('/api/auto-sync', { method: 'POST' })
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || '啟動失敗')
    setStarting(false)
    load()
  }

  if (!status) return null
  const s = status.lastSummary

  return (
    <div className="bg-surface rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">自動硬體同步</h2>
          <p className="text-xs text-gray-500 mt-1">
            {status.enabled
              ? `每 ${status.intervalDays} 天、台灣時間 ${status.hour}:00 透過 SAA 自動抓取所有設備的硬體資訊`
              : '已關閉（環境變數 AUTO_SYNC_DAYS=0）'}
          </p>
        </div>
        <button onClick={runNow} disabled={status.running || starting}
          className="shrink-0 px-3 py-1.5 bg-surface text-gray-700 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
          {status.running ? '執行中…' : '立即執行'}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div>
          <dt className="text-xs text-gray-500">上次執行</dt>
          <dd className="mt-0.5 text-gray-900">{fmtDateTime(status.lastRunAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">下次預計</dt>
          <dd className="mt-0.5 text-gray-900">{status.enabled ? fmtDateTime(status.nextRunAt) : '—'}</dd>
        </div>
      </dl>

      {s && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">共 {s.total} 台</span>
          <span className="px-2 py-1 rounded bg-green-100 text-green-700">成功 {s.success}</span>
          {s.failed > 0 && <span className="px-2 py-1 rounded bg-red-100 text-red-700">失敗 {s.failed}</span>}
          {s.offline > 0 && <span className="px-2 py-1 rounded bg-orange-100 text-orange-700">新失聯 {s.offline}</span>}
          {s.skipped > 0 && <span className="px-2 py-1 rounded bg-gray-100 text-gray-500">持續失聯略過 {s.skipped}</span>}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        同步前會先 ping BMC。連不上的設備只會在第一次失聯時記一筆「失聯」，之後持續失聯就直接略過、不再重試；
        恢復連線後下一輪會自動恢復同步。
      </p>
    </div>
  )
}
