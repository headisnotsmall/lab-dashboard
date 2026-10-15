import { getOperatorName } from './operator'

/** 所有 API 呼叫都走這裡，自動帶上操作者名稱（header 只能放 ASCII，所以先 encode） */
export function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const name = typeof window !== 'undefined' ? getOperatorName() : ''
  if (name) headers.set('X-Operator', encodeURIComponent(name))
  return fetch(input, { ...init, headers })
}

/** PATCH 單一設備欄位；失敗時跳出提示並回傳 false */
export async function patchDevice(id: number, data: Record<string, unknown>) {
  try {
    const res = await apiFetch(`/api/devices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    return true
  } catch (err) {
    alert(`儲存失敗：${err instanceof Error ? err.message : err}`)
    return false
  }
}

export async function pingHost(ip: string): Promise<boolean> {
  try {
    const res = await apiFetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    })
    const data = await res.json()
    return !!data.online
  } catch {
    return false
  }
}

/** 以固定併發數依序執行，避免一次打爆 BMC / SAA */
export async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!)
  })
  await Promise.all(workers)
}
