import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'
import { archiveAndClearBorrow } from '@/lib/borrow'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const deviceId = Number(params.id)
  const device = await prisma.device.findUnique({ where: { id: deviceId } })
  if (!device) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 寫借用紀錄 + 清空借用欄位在同一個 transaction，不會只做一半
  await prisma.$transaction(tx => archiveAndClearBorrow(tx, device))
  if (device.borrowedBy) {
    await audit({ operator: getOperator(req), action: '歸還', deviceId, deviceName: device.name, detail: `借用人：${device.borrowedBy}` })
  }

  const now = new Date()
  const nextReservation = await prisma.reservation.findFirst({
    where: { deviceId, fromDate: { lte: now } },
    orderBy: { fromDate: 'asc' },
  })

  return NextResponse.json({ ok: true, nextReservation })
}
