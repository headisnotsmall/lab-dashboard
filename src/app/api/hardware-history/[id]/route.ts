import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'
import { FIELD_LABELS } from '@/lib/device-fields'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { notes } = await request.json()
  const record = await prisma.hardwareHistory.update({
    where: { id: Number(params.id) },
    data: { notes: String(notes ?? '') },
  })
  return NextResponse.json(record)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const r = await prisma.hardwareHistory.findUnique({ where: { id: Number(params.id) }, include: { device: true } })
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.hardwareHistory.delete({ where: { id: r.id } })
  await audit({ operator: getOperator(request), action: '刪除系統資料紀錄', deviceId: r.deviceId, deviceName: r.device.name,
    detail: `${FIELD_LABELS[r.field] ?? r.field}：${r.oldValue || '（空）'} → ${r.newValue || '（空）'}` })
  return NextResponse.json({ ok: true })
}
