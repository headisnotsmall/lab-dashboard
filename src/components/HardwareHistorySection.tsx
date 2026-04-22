'use client'
import { useEffect, useState, useRef } from 'react'
import { HardwareHistory } from '@/lib/types'

const FIELD_LABELS: Record<string, string> = {
  cpuInfo: 'CPU', ramInfo: 'RAM', bmcVersion: 'BMC 版本', biosVersion: 'BIOS 版本',
}

function NotesCell({ record, onSaved }: { record: HardwareHistory; onSaved: (id: number, notes: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(record.notes)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    if (val === record.notes) { setEditing(false); return }
    await fetch(`/api/hardware-history/${record.id}`, {
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

function fmtTime(iso: string) {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`
}

export default function HardwareHistorySection({ deviceId }: { deviceId: number }) {
  const [history, setHistory] = useState<HardwareHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/devices/${deviceId}/hardware-history`)
      .then(r => r.json())
      .then(data => { setHistory(data); setLoading(false) })
  }, [deviceId])

  function handleNotesSaved(id: number, notes: string) {
    setHistory(h => h.map(r => r.id === id ? { ...r, notes } : r))
  }

  async function handleDelete(id: number) {
    await fetch(`/api/hardware-history/${id}`, { method: 'DELETE' })
    setHistory(h => h.filter(r => r.id !== id))
  }

  if (loading) return null

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-4">硬體變更紀錄</h2>
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
                <th className="pb-2 font-medium pr-4">備註</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{fmtTime(r.createdAt)}</td>
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
                      r.source === 'redfish'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {r.source === 'redfish' ? 'Redfish' : '手動'}
                    </span>
                  </td>
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
