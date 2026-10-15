import { NextRequest, NextResponse } from 'next/server'
import { getAutoSyncStatus, runAutoSync } from '@/lib/auto-sync'
import { getOperator } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getAutoSyncStatus())
}

/** 手動觸發一輪；在背景執行，立即回傳 */
export async function POST(req: NextRequest) {
  const status = await getAutoSyncStatus()
  if (status.running) return NextResponse.json({ error: '自動同步正在執行中' }, { status: 409 })
  runAutoSync(getOperator(req)).catch(e => console.error('[auto-sync] manual run failed', e))
  return NextResponse.json({ ok: true })
}
