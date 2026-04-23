'use client'
import { useEffect, useState } from 'react'
import { SyncLog } from '@/lib/types'

const FIELD_LABELS: Record<string, string> = {
  cpuInfo: 'CPU', ramInfo: 'RAM', gpuInfo: 'GPU',
  bmcVersion: 'BMC 版本', biosVersion: 'BIOS 版本',
  bmcMac: 'BMC MAC', serialNumber: 'S/N',
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function SyncLogSection({ deviceId, refreshKey }: { deviceId: number; refreshKey?: number }) {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/devices/${deviceId}/sync-logs`)
      .then(r => r.json())
      .then(data => { setLogs(data); setLoading(false) })
  }, [deviceId, refreshKey])

  if (loading) return null

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-4">抓取紀錄</h2>
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
                    <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{fmtTime(log.createdAt)}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        log.status === 'success'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {log.status === 'success' ? '成功' : '失敗'}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-gray-600">
                      {log.status === 'success'
                        ? fields.length > 0
                          ? `更新：${fields.map(f => FIELD_LABELS[f] ?? f).join('、')}`
                          : '無欄位變更'
                        : <span className="text-red-500">{log.errorMessage || '未知錯誤'}</span>
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
