import { prisma } from './db'
import { ping } from './ping'
import { syncDevice, writeSyncLog } from './sync'
import { audit, SYSTEM_OPERATOR } from './audit'

// 預設每 14 天、台灣時間凌晨 3 點跑一次；AUTO_SYNC_DAYS=0 可關閉
export const AUTO_SYNC_DAYS = Number(process.env.AUTO_SYNC_DAYS ?? 14)
export const AUTO_SYNC_HOUR = Number(process.env.AUTO_SYNC_HOUR ?? 3)
const CONCURRENCY = 4
const CHECK_INTERVAL_MS = 30 * 60 * 1000
const KEY_LAST_RUN = 'autoSync.lastRunAt'
const KEY_LAST_SUMMARY = 'autoSync.lastSummary'

export interface AutoSyncSummary {
  total: number
  success: number
  failed: number
  offline: number      // 這次才發現失聯（有寫紀錄）
  skipped: number      // 先前已記錄失聯，這次 ping 仍不通 → 安靜略過
  finishedAt: string
}

// dev 模式 hot reload 會重新載入 module，狀態掛在 globalThis 避免重複排程
const g = globalThis as unknown as { __autoSync?: { timer?: NodeJS.Timeout; running: boolean } }
g.__autoSync ??= { running: false }
const state = g.__autoSync

async function getSetting(key: string) {
  return (await prisma.appSetting.findUnique({ where: { key } }))?.value ?? null
}

async function setSetting(key: string, value: string) {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
}

function taipeiHour(d = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', hour: 'numeric', hourCycle: 'h23' }).format(d))
}

/** 下次預計執行時間（只是估算，給 UI 顯示用） */
export function nextRunAt(lastRunAt: Date | null) {
  if (AUTO_SYNC_DAYS <= 0) return null
  const base = lastRunAt ? new Date(lastRunAt.getTime() + AUTO_SYNC_DAYS * 86400000) : new Date()
  // 對齊到之後第一個「台灣時間 AUTO_SYNC_HOUR 點」
  const t = new Date(base)
  t.setUTCMinutes(0, 0, 0)
  while (taipeiHour(t) !== AUTO_SYNC_HOUR || t < base) t.setTime(t.getTime() + 3600000)
  return t
}

export async function getAutoSyncStatus() {
  const last = await getSetting(KEY_LAST_RUN)
  const summary = await getSetting(KEY_LAST_SUMMARY)
  const lastRunAt = last ? new Date(last) : null
  return {
    enabled: AUTO_SYNC_DAYS > 0,
    intervalDays: AUTO_SYNC_DAYS,
    hour: AUTO_SYNC_HOUR,
    running: state.running,
    lastRunAt,
    nextRunAt: nextRunAt(lastRunAt),
    lastSummary: summary ? JSON.parse(summary) as AutoSyncSummary : null,
  }
}

/**
 * 跑一輪自動同步：
 * - 先 ping BMC，不通就不打 SAA
 * - 失聯只在「剛失聯」那次寫一筆 offline 紀錄；之後持續失聯就安靜略過，不會一直累積失敗紀錄
 * - 恢復連線後下一輪自動回到正常同步
 */
export async function runAutoSync(operator = SYSTEM_OPERATOR): Promise<AutoSyncSummary | null> {
  if (state.running) return null
  state.running = true
  try {
    const devices = await prisma.device.findMany({ where: { bmcIp: { not: '' } } })
    const summary: AutoSyncSummary = { total: devices.length, success: 0, failed: 0, offline: 0, skipped: 0, finishedAt: '' }

    const queue = [...devices]
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const d = queue.shift()!
        if (!await ping(d.bmcIp)) {
          const lastLog = await prisma.syncLog.findFirst({ where: { deviceId: d.id }, orderBy: { createdAt: 'desc' } })
          if (lastLog?.status === 'offline') {
            summary.skipped++
          } else {
            summary.offline++
            await writeSyncLog(d.id, 'offline', [], 'BMC 無回應，暫停自動同步直到恢復連線', 'auto')
          }
          continue
        }
        try {
          await syncDevice(d, { source: 'auto', operator })
          summary.success++
        } catch {
          summary.failed++
        }
      }
    }))

    summary.finishedAt = new Date().toISOString()
    await setSetting(KEY_LAST_RUN, summary.finishedAt)
    await setSetting(KEY_LAST_SUMMARY, JSON.stringify(summary))
    await audit({
      operator,
      action: '自動同步硬體資訊',
      detail: `共 ${summary.total} 台：成功 ${summary.success}、失敗 ${summary.failed}、新失聯 ${summary.offline}、持續失聯略過 ${summary.skipped}`,
    })
    return summary
  } finally {
    state.running = false
  }
}

async function tick() {
  try {
    if (AUTO_SYNC_DAYS <= 0 || state.running) return
    if (taipeiHour() !== AUTO_SYNC_HOUR) return
    const last = await getSetting(KEY_LAST_RUN)
    // 留 2 小時緩衝，避免因為檢查時間點飄移而晚一輪
    if (last && Date.now() - new Date(last).getTime() < AUTO_SYNC_DAYS * 86400000 - 2 * 3600000) return
    console.log('[auto-sync] start')
    const summary = await runAutoSync()
    console.log('[auto-sync] done', summary)
  } catch (e) {
    console.error('[auto-sync] failed', e)
  }
}

export function startAutoSyncScheduler() {
  if (state.timer || AUTO_SYNC_DAYS <= 0) return
  state.timer = setInterval(tick, CHECK_INTERVAL_MS)
  console.log(`[auto-sync] scheduler started: every ${AUTO_SYNC_DAYS} days at ${AUTO_SYNC_HOUR}:00 Asia/Taipei`)
}
