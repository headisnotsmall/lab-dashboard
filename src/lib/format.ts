const pad = (n: number) => String(n).padStart(2, '0')

export function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

export function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—'
  const date = new Date(d)
  return `${fmtDate(d)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 距離指定日期還有幾天（已過期為負數） */
export function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export type DueLevel = 'overdue' | 'soon' | 'ok'

export function dueLevel(d: string | null | undefined): DueLevel | null {
  if (!d) return null
  const diff = daysUntil(d)
  if (diff < 0) return 'overdue'
  if (diff <= 3) return 'soon'
  return 'ok'
}
