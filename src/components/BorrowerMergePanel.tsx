'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/lib/api'

interface NameCount { name: string; count: number }

/** 去掉「 - TW (System)」「(PWS)」、大小寫與空白後比對，用來找出可能是同一個人的寫法 */
function normalize(name: string) {
  return name
    .replace(/\s*-\s*[A-Z]{2}\s*\([^)]*\)\s*$/, '')
    .replace(/\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/[^a-z一-鿿]/g, '')
}

export default function BorrowerMergePanel() {
  const [names, setNames] = useState<NameCount[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setNames(await apiFetch('/api/borrowers?counts=1').then(r => r.json()))
  }, [])
  useEffect(() => { load() }, [load])

  const suggestions = useMemo(() => {
    const groups = new Map<string, NameCount[]>()
    for (const n of names ?? []) {
      const key = normalize(n.name)
      if (key) groups.set(key, [...(groups.get(key) ?? []), n])
    }
    // names 已依次數排序，所以每組第一個就是最常用的寫法
    return Array.from(groups.values()).filter(g => g.length > 1)
  }, [names])

  function pick(group: string[], to: string) {
    setSelected(new Set(group))
    setTarget(to)
    setMessage('')
  }

  function toggle(name: string) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function merge() {
    const from = Array.from(selected).filter(n => n !== target.trim())
    if (!target.trim() || !from.length) return
    if (!confirm(`把以下名字統一改成「${target.trim()}」？\n\n${from.join('\n')}\n\n目前借用、借用紀錄、預約都會一起改，無法自動復原。`)) return
    setBusy(true)
    const res = await apiFetch('/api/borrowers/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: target.trim() }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { alert(body.error || '合併失敗'); return }
    setMessage(`已更新 ${body.total} 筆（目前借用 ${body.devices}、借用紀錄 ${body.history}、預約 ${body.reservations}）`)
    setSelected(new Set())
    setTarget('')
    load()
  }

  if (!names) return null
  const query = q.trim().toLowerCase()
  const shown = names.filter(n => !query || n.name.toLowerCase().includes(query) || selected.has(n.name))
  const fromCount = Array.from(selected).filter(n => n !== target.trim()).length

  return (
    <div className="bg-surface rounded-lg border border-gray-200 shadow-sm p-5">
      <h2 className="font-semibold text-gray-900">借用人名稱整理</h2>
      <p className="text-xs text-gray-500 mt-1 mb-4">同一個人有多種寫法時，勾選後統一成一個名字（括號內是出現次數）</p>

      {message && <div className="bg-green-50 text-green-700 px-3 py-2 rounded-md text-sm mb-4">{message}</div>}

      {suggestions.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-700 mb-2">可能是同一人</div>
          <div className="space-y-1.5">
            {suggestions.map(g => (
              <button key={g[0].name} type="button" onClick={() => pick(g.map(n => n.name), g[0].name)}
                className="w-full text-left text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md px-3 py-2">
                {g.map(n => `${n.name} (${n.count})`).join('、')}
              </button>
            ))}
          </div>
        </div>
      )}

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋名字..."
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-md divide-y divide-gray-50 mb-4">
        {shown.map(n => (
          <label key={n.name} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={selected.has(n.name)} onChange={() => toggle(n.name)} />
            <span className="flex-1 truncate text-gray-800">{n.name}</span>
            <span className="text-xs text-gray-400">{n.count}</span>
            {selected.has(n.name) && (
              <button type="button" onClick={e => { e.preventDefault(); setTarget(n.name) }}
                className={`text-xs ${target === n.name ? 'text-blue-700 font-medium' : 'text-gray-400 hover:text-blue-600'}`}>
                {target === n.name ? '✓ 統一用這個' : '用這個'}
              </button>
            )}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-600">統一成</span>
        <input value={target} onChange={e => setTarget(e.target.value)} placeholder="名字"
          className="flex-1 min-w-[10rem] border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="button" onClick={merge} disabled={busy || !target.trim() || fromCount === 0}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
          合併 {fromCount > 0 ? `${fromCount} 個` : ''}
        </button>
      </div>
    </div>
  )
}
