import { NextRequest } from 'next/server'
import { prisma } from './db'
import { DEVICE_DATE_FIELDS, FIELD_LABELS, SECRET_FIELDS } from './device-fields'

export const SYSTEM_OPERATOR = '系統'

/** 前端在 X-Operator header 帶上 encodeURIComponent 過的名字（header 只能放 ASCII） */
export function getOperator(req: NextRequest) {
  const raw = req.headers.get('x-operator') ?? ''
  try {
    return decodeURIComponent(raw).trim().slice(0, 50) || '未具名'
  } catch {
    return '未具名'
  }
}

export async function audit(entry: {
  operator: string
  action: string
  detail?: string
  deviceId?: number | null
  deviceName?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        operator: entry.operator,
        action: entry.action,
        detail: entry.detail ?? '',
        deviceId: entry.deviceId ?? null,
        deviceName: entry.deviceName ?? '',
      },
    })
  } catch (e) {
    // 紀錄失敗不該擋住正常操作
    console.error('audit failed:', e)
  }
}

const DATE_SET = new Set<string>(DEVICE_DATE_FIELDS)

function show(field: string, v: unknown) {
  if (v === null || v === undefined || v === '') return '（空）'
  if (SECRET_FIELDS.has(field)) return '••••'
  if (DATE_SET.has(field)) return new Date(v as string).toISOString().slice(0, 10)
  return String(v)
}

/** 比對新舊值，產生「狀態：閒置 → 測試」這種摘要；沒有差異回傳空字串 */
export function describeChanges(oldValues: Record<string, unknown>, newValues: Record<string, unknown>) {
  return Object.keys(newValues)
    .filter(f => newValues[f] !== undefined && show(f, oldValues[f]) !== show(f, newValues[f]))
    .map(f => SECRET_FIELDS.has(f)
      ? `${FIELD_LABELS[f] ?? f}：已變更`
      : `${FIELD_LABELS[f] ?? f}：${show(f, oldValues[f])} → ${show(f, newValues[f])}`)
    .join('\n')
}
