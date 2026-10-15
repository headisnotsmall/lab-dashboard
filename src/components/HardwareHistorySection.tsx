'use client'
import { useEffect, useState, useRef } from 'react'
import { HardwareHistory } from '@/lib/types'
import { fmtDateTime } from '@/lib/format'
import { apiFetch } from '@/lib/api'

const FIELD_LABELS: Record<string, string> = {
  cpuInfo: 'CPU', ramInfo: 'RAM', storageInfo: 'Storage', gpuInfo: 'GPU', aocInfo: 'AOC',
  serialNumber: 'S/N', bmcMac: 'BMC MAC', ip: 'IP', bmcIp: 'BMC IP',
  osStatus: 'OS 狀態', bmcVersion: 'BMC 版本', biosVersion: 'BIOS 版本',
}

const TRACKED_FIELDS = new Set(Object.keys(FIELD_LABELS))

// redfish 是早期版本用 Redfish API 同步留下的紀錄
const SOURCE_LABELS: Record<string, string> = { saa: 'SAA', redfish: 'Redfish', manual: '手動' }

function NotesCell({ record, onSaved }: { record: HardwareHistory; onSaved: (id: number, notes: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(record.notes)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    if (val === record.notes) { setEditing(false); return }
    await apiFetch(`/api/hardware-history/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: val }),
    })
    setEditing(false)
    onSaved(record.id, val)
  }

  if (editing) return (
    <input
      ref={inputRef}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') { setVal(record.notes); setEditing(false) }
      }}
      className="w-full border border-blue-400 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      placeholder="新增備註..."
    />
  )

  return (
    <span
      onClick={() => setEditing(true)}
      className="block cursor-pointer rounded px-1 py-0.5 hover:bg-blue-50 hover:text-blue-700 text-xs text-gray-600 min-h-[20px]"
      title="點擊編輯備註"
    >
      {val || <span className="text-gray-300">點擊新增備註</span>}
    </span>
  )
}


export default function HardwareHistorySection({ deviceId, refreshKey }: { deviceId: number; refreshKey?: number }) {
  const [history, setHistory] = useState<HardwareHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/api/devices/${deviceId}/hardware-history`)
      .then(r => r.json())
      .then(data => { setHistory(data.filter((r: HardwareHistory) => TRACKED_FIELDS.has(r.field))); setLoading(false) })
  }, [deviceId, refreshKey])

  function handleNotesSaved(id: number, notes: string) {
    setHistory(h => h.map(r => r.id === id ? { ...r, notes } : r))
  }

  async function handleDelete(id: number) {
    if (!confirm('確定刪除這筆紀錄？')) return
    await apiFetch(`/api/hardware-history/${id}`, { method: 'DELETE' })
    setHistory(h => h.filter(r => r.id !== id))
  }

  if (loading) return null

  return (
    <div>
      {history.length === 0 ? (
        <p className="text-sm text-gray-400">尚無變更紀錄</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <th className="pb-2 font-medium pr-4">時間</th>
                <th className="pb-2 font-medium pr-4">欄位</th>
                <th className="pb-2 font-medium pr-4">變更前</th>
                <th className="pb-2 font-medium pr-4">變更後</th>
                <th className="pb-2 font-medium pr-4">來源</th>
                <th className="pb-2 font-medium pr-4">操作者</th>
                <th className="pb-2 font-medium pr-4">備註</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                  <td className="py-2 pr-4 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {FIELD_LABELS[r.field] ?? r.field}
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-400 max-w-[160px]">
                    <span className="block truncate" title={r.oldValue}>{r.oldValue || '—'}</span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-900 max-w-[160px]">
                    <span className="block truncate" title={r.newValue}>{r.newValue || '—'}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      r.source === 'manual'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {SOURCE_LABELS[r.source] ?? r.source}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-600 whitespace-nowrap">{r.operator || <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 pr-4 min-w-[160px]">
                    <NotesCell record={r} onSaved={handleNotesSaved} />
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-xs text-gray-300 hover:text-red-500 px-1"
                      title="刪除此紀錄"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
