'use client'
import { useEffect, useState } from 'react'

interface StateOption { id: number; name: string; order: number }

export default function SettingsPage() {
  const [states, setStates] = useState<StateOption[]>([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const load = () => fetch('/api/states').then(r => r.json()).then(setStates)
  useEffect(() => { load() }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true)
    await fetch('/api/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName('')
    setAdding(false)
    load()
  }

  async function remove(id: number, name: string) {
    if (!confirm(`確定刪除狀態「${name}」？`)) return
    await fetch(`/api/states/${id}`, { method: 'DELETE' })
    load()
  }

  async function move(index: number, direction: 'up' | 'down') {
    const next = [...states]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return

    const aOrder = next[index].order
    const bOrder = next[swap].order

    await Promise.all([
      fetch(`/api/states/${next[index].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: bOrder }),
      }),
      fetch(`/api/states/${next[swap].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: aOrder }),
      }),
    ])
    load()
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">系統狀態選單</h2>

        <div className="space-y-2 mb-4">
          {states.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
              <span className="text-sm text-gray-900">{s.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => move(i, 'up')} disabled={i === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">↑</button>
                <button onClick={() => move(i, 'down')} disabled={i === states.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1">↓</button>
                <button onClick={() => remove(s.id, s.name)}
                  className="text-red-400 hover:text-red-600 text-xs ml-1">刪除</button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={add} className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="新狀態名稱"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={adding || !newName.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
            新增
          </button>
        </form>
      </div>
    </div>
  )
}
