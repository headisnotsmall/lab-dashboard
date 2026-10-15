'use client'
import { useEffect, useState } from 'react'
import { SyncLog } from '@/lib/types'
import { fmtDateTime } from '@/lib/format'
import { FIELD_LABELS } from '@/lib/device-fields'
import { apiFetch } from '@/lib/api'



export default function SyncLogSection({ deviceId, refreshKey }: { deviceId: number; refreshKey?: number }) {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/devices/${deviceId}/sync-logs`)
      .then(r => r.json())
      .then(data => { setLogs(data); setLoading(false) })
  }, [deviceId, refreshKey])

  if (loading) return null

  return (
    <div>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">尚無抓取紀錄</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-2 font-medium pr-4">時間</th>
                <th className="pb-2 font-medium pr-4">狀態</th>
                <th className="pb-2 font-medium">結果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => {
                const fields: string[] = log.updatedFields ? JSON.parse(log.updatedFields) : []
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        log.status === 'success' ? 'bg-green-50 text-green-700'
                          : log.status === 'offline' ? 'bg-gray-100 text-gray-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {log.status === 'success' ? '成功' : log.status === 'offline' ? '失聯' : '失敗'}
                      </span>
                      <span className="ml-1.5 text-[11px] text-gray-400">{log.source === 'auto' ? '自動' : '手動'}</span>
                    </td>
                    <td className="py-2 text-xs text-gray-600">
                      {log.status === 'success'
                        ? fields.length > 0
                          ? `更新：${fields.map(f => FIELD_LABELS[f] ?? f).join('、')}`
                          : '無欄位變更'
                        : <span className={log.status === 'offline' ? 'text-gray-500' : 'text-red-500'}>{log.errorMessage || '未知錯誤'}</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
