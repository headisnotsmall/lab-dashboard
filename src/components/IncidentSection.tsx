'use client'
import { useState } from 'react'
import { Incident } from '@/lib/types'

interface Props {
  deviceId: number
  incidents: Incident[]
  onUpdate: () => void
}

export default function IncidentSection({ deviceId, incidents, onUpdate }: Props) {
  const [form, setForm] = useState({ title: '', description: '', occurredAt: '' })
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, deviceId }),
    })
    setForm({ title: '', description: '', occurredAt: '' })
    setOpen(false)
    setAdding(false)
    onUpdate()
  }

  async function remove(id: number) {
    if (!confirm('確定刪除此事件？')) return
    await fetch(`/api/incidents/${id}`, { method: 'DELETE' })
    onUpdate()
  }

  const fmt = (d: string) => {
    const date = new Date(d)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}/${mm}/${dd}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">事件記錄</h3>
        <button onClick={() => setOpen(!open)} className="text-sm text-blue-600 hover:text-blue-700">
          + 記錄事件
        </button>
      </div>

      {open && (
        <form onSubmit={add} className="bg-gray-50 rounded-md p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">事件標題 *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="例如：系統無法開機"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">詳細描述</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="處理過程、結果..."
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">發生時間</label>
            <input type="datetime-local" value={form.occurredAt} onChange={e => setForm(f => ({ ...f, occurredAt: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={adding}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
              新增
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-3 py-1.5 bg-white text-gray-700 text-xs rounded border border-gray-300 hover:bg-gray-50">
              取消
            </button>
          </div>
        </form>
      )}

      {incidents.length === 0 ? (
        <p className="text-sm text-gray-400">尚無事件記錄</p>
      ) : (
        <div className="space-y-3">
          {incidents.map(inc => (
            <div key={inc.id} className="border-l-2 border-orange-300 pl-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inc.title}</p>
                  {inc.description && <p className="text-xs text-gray-500 mt-0.5">{inc.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{fmt(inc.occurredAt)}</p>
                </div>
                <button onClick={() => remove(inc.id)} className="text-red-400 hover:text-red-600 text-xs ml-2 shrink-0">刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
