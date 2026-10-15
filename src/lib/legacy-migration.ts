import { prisma } from './db'
import { HARDWARE_FIELDS } from './hardware-history'
import { FIELD_LABELS } from './device-fields'

export const LEGACY_OPERATOR = '（舊紀錄）'
const FLAG_KEY = 'migration.legacyHardwareHistory'

// 早期版本把借用人存在 operator 欄位，後來改名 borrowedBy；兩者常在同一筆編輯裡重複出現
const LEGACY_LABELS: Record<string, string> = { ...FIELD_LABELS, operator: '借用人' }

const show = (v: string) => v === '' ? '（空）' : v

/**
 * 有操作紀錄（AuditLog）之前，借用人／狀態等非硬體欄位的變更是寫在 HardwareHistory 裡，
 * 畫面上被過濾掉看不到。這裡把它們複製成 AuditLog（保留原時間），同一台 1 分鐘內的變更合成一筆。
 * 原始資料不刪；用 AppSetting 旗標確保只跑一次。
 */
export async function migrateLegacyHardwareHistory() {
  const done = await prisma.appSetting.findUnique({ where: { key: FLAG_KEY } })
  if (done) return

  const rows = await prisma.hardwareHistory.findMany({
    where: { field: { notIn: [...HARDWARE_FIELDS] } },
    include: { device: { select: { name: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

  // operator 與 borrowedBy 有時分成兩次儲存（相隔幾秒），內容相同的 operator 列直接略過
  const isDuplicateOperator = (r: typeof rows[number]) => r.field === 'operator' && rows.some(b =>
    b.field === 'borrowedBy' && b.deviceId === r.deviceId && b.oldValue === r.oldValue && b.newValue === r.newValue &&
    Math.abs(b.createdAt.getTime() - r.createdAt.getTime()) < 60_000)

  // 以前每個欄位是各自點擊儲存，同一台 1 分鐘內連續的變更視為同一次編輯
  const groups: (typeof rows)[] = []
  const open = new Map<number, typeof rows>()
  for (const r of rows.filter(r => !isDuplicateOperator(r))) {
    const g = open.get(r.deviceId)
    if (g && r.createdAt.getTime() - g[g.length - 1].createdAt.getTime() < 60_000) {
      g.push(r)
    } else {
      const fresh = [r]
      groups.push(fresh)
      open.set(r.deviceId, fresh)
    }
  }

  const entries = groups.map(g => {
    // 同一欄位在這段時間內改了好幾次（例如 Cheryl → Cheryl Chang），只留最初 → 最後
    const byField = new Map<string, { oldValue: string; newValue: string; notes: string[] }>()
    for (const r of g) {
      const f = byField.get(r.field)
      if (f) f.newValue = r.newValue
      else byField.set(r.field, { oldValue: r.oldValue, newValue: r.newValue, notes: [] })
      if (r.notes) byField.get(r.field)!.notes.push(r.notes)
    }
    const lines = Array.from(byField.entries())
      .filter(([, v]) => v.oldValue !== v.newValue || v.notes.length)
      .map(([field, v]) => `${LEGACY_LABELS[field] ?? field}：${show(v.oldValue)} → ${show(v.newValue)}${v.notes.length ? `（${v.notes.join('；')}）` : ''}`)
    if (!lines.length) return null
    return {
      deviceId: g[0].deviceId,
      deviceName: g[0].device.name,
      operator: LEGACY_OPERATOR,
      action: '修改',
      detail: lines.join('\n'),
      createdAt: g[0].createdAt,
    }
  }).filter(e => e !== null)

  await prisma.$transaction([
    prisma.auditLog.createMany({ data: entries }),
    prisma.appSetting.create({ data: { key: FLAG_KEY, value: new Date().toISOString() } }),
  ])
  console.log(`[migration] 舊的借用欄位變更紀錄 ${rows.length} 筆 → 操作紀錄 ${entries.length} 筆`)
}
