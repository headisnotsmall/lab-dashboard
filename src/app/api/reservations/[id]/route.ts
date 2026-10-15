import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'
import { fmtDate } from '@/lib/format'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const r = await prisma.reservation.findUnique({ where: { id: Number(params.id) }, include: { device: true } })
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.reservation.delete({ where: { id: r.id } })
  await audit({ operator: getOperator(req), action: '刪除預約', deviceId: r.deviceId, deviceName: r.device.name,
    detail: `${r.borrower}：${fmtDate(r.fromDate.toISOString())} ~ ${fmtDate(r.toDate.toISOString())}` })
  return NextResponse.json({ ok: true })
}
