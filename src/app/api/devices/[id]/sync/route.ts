import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncDevice } from '@/lib/sync'
import { audit, getOperator } from '@/lib/audit'
import { FIELD_LABELS } from '@/lib/device-fields'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const device = await prisma.device.findUnique({ where: { id: Number(params.id) } })
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!device.bmcIp) return NextResponse.json({ error: '此設備沒有設定 BMC IP' }, { status: 400 })

  const operator = getOperator(req)
  try {
    const updates = await syncDevice(device, { source: 'manual', operator })
    const fields = Object.keys(updates).map(f => FIELD_LABELS[f] ?? f)
    await audit({ operator, action: '抓取硬體資訊', deviceId: device.id, deviceName: device.name,
      detail: fields.length ? `取得：${fields.join('、')}` : '' })
    return NextResponse.json({ ok: true, updates })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await audit({ operator, action: '抓取硬體資訊失敗', deviceId: device.id, deviceName: device.name, detail: msg })
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
