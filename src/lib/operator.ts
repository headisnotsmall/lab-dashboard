// 操作者名稱存在瀏覽器 localStorage；沒有登入機制，等同自報身分
const KEY = 'lab-operator'
const EVENT = 'lab-operator-change'

export function getOperatorName(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function setOperatorName(name: string) {
  try {
    localStorage.setItem(KEY, name)
  } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT))
}

export function onOperatorChange(cb: () => void) {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}
