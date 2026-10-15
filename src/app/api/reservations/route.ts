import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'
import { fmtDate } from '@/lib/format'

export async function POST(request: NextRequest) {
  const data = await request.json()
  const device = await prisma.device.findUnique({ where: { id: Number(data.deviceId) } })
  if (!device) return NextResponse.json({ error: '設備不存在' }, { status: 404 })
  const reservation = await prisma.reservation.create({
    data: {
      deviceId: device.id,
      borrower: String(data.borrower ?? '').trim(),
      fromDate: new Date(data.fromDate),
      toDate: new Date(data.toDate),
      reason: data.reason ?? '',
      description: data.description ?? '',
    },
  })
  await audit({ operator: getOperator(request), action: '新增預約', deviceId: device.id, deviceName: device.name,
    detail: `${reservation.borrower}：${fmtDate(reservation.fromDate.toISOString())} ~ ${fmtDate(reservation.toDate.toISOString())}` })
  return NextResponse.json(reservation, { status: 201 })
}
