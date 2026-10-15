'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getOperatorName, setOperatorName, onOperatorChange } from '@/lib/operator'
import { apiFetch } from '@/lib/api'

/** 導覽列上的「目前操作者」；第一次使用時強制填名字 */
export default function OperatorPicker() {
  const [name, setName] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sync = () => setName(getOperatorName())
    sync()
    return onOperatorChange(sync)
  }, [])

  // 還沒設定名字就自動打開
  useEffect(() => { if (name === '') setOpen(true) }, [name])

  useEffect(() => {
    if (!open) return
    setDraft(name ?? '')
    apiFetch('/api/operators').then(r => r.json()).then(setSuggestions).catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [open, name])

  const mustPick = !name
  function save(e?: React.FormEvent) {
    e?.preventDefault()
    const v = draft.trim()
    if (!v) return
    setOperatorName(v)
    setOpen(false)
  }

  if (name === null) return null // SSR / 尚未讀到 localStorage

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="切換操作者"
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 shrink-0">
        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-medium flex items-center justify-center">
          {name ? name.slice(0, 1).toUpperCase() : '?'}
        </span>
        <span className="hidden sm:inline max-w-[8rem] truncate">{name || '未設定'}</span>
      </button>

      {/* 用 portal 掛到 body：導覽列有 backdrop-filter，會讓 fixed 定位以導覽列為基準 */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={e => { if (e.target === e.currentTarget && !mustPick) setOpen(false) }}>
          <form onSubmit={save} className="w-full max-w-sm bg-surface rounded-xl shadow-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">{mustPick ? '你是誰？' : '切換操作者'}</h2>
              <p className="text-xs text-gray-500 mt-1">
                名字會記在這個瀏覽器，之後的修改都會留下操作紀錄。
              </p>
            </div>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape' && !mustPick) setOpen(false) }}
              placeholder="輸入名字"
              maxLength={50}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 12).map(s => (
                  <button key={s} type="button" onClick={() => setDraft(s)}
                    className={`text-xs px-2 py-1 rounded-full border ${draft === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2">
              {!mustPick && (
                <button type="button" onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 rounded-md border border-gray-300 hover:bg-gray-50">取消</button>
              )}
              <button type="submit" disabled={!draft.trim()}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">確定</button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
  )
}
