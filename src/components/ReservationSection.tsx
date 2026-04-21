'use client'
import { useState } from 'react'
import { Reservation } from '@/lib/types'

interface Props {
  deviceId: number
  reservations: Reservation[]
  onUpdate: () => void
}

export default function ReservationSection({ deviceId, reservations, onUpdate }: Props) {
  const [form, setForm] = useState({ borrower: '', fromDate: '', toDate: '', reason: '' })
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, deviceId }),
    })
    setForm({ borrower: '', fromDate: '', toDate: '', reason: '' })
    setOpen(false)
    setAdding(false)
    onUpdate()
  }

  async function remove(id: number) {
    if (!confirm('確定刪除此預約？')) return
    await fetch(`/api/reservations/${id}`, { method: 'DELETE' })
    onUpdate()
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('zh-TW')

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">借用排程</h3>
        <button
          onClick={() => setOpen(!open)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + 新增預約
        </button>
      </div>

      {open && (
        <form onSubmit={add} className="bg-gray-50 rounded-md p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">借用人 *</label>
              <input required value={form.borrower} onChange={e => setForm(f => ({ ...f, borrower: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">原因</label>
              <input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">開始日期 *</label>
              <input required type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">結束日期 *</label>
              <input required type="date" value={form.toDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
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

      {reservations.length === 0 ? (
        <p className="text-sm text-gray-400">尚無排程</p>
      ) : (
        <div className="space-y-2">
          {reservations.map(r => (
            <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
              <div>
                <span className="text-sm font-medium text-gray-900">{r.borrower}</span>
                <span className="text-xs text-gray-500 ml-2">{fmt(r.fromDate)} ~ {fmt(r.toDate)}</span>
                {r.reason && <span className="text-xs text-gray-400 ml-2">— {r.reason}</span>}
              </div>
              <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600 text-xs">刪除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
