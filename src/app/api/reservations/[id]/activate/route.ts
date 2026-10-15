import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'
import { archiveAndClearBorrow } from '@/lib/borrow'
import { fmtDate } from '@/lib/format'

/**
 * 把預約推送成目前借用：
 * 目前若有人借用，先存進借用紀錄；再寫入新借用人並刪除預約。全部在同一個 transaction
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const reservation = await prisma.reservation.findUnique({ where: { id: Number(params.id) }, include: { device: true } })
  if (!reservation) return NextResponse.json({ error: '預約不存在（可能已被推送或刪除）' }, { status: 404 })
  const { device } = reservation

  const updated = await prisma.$transaction(async tx => {
    await archiveAndClearBorrow(tx, device)
    const d = await tx.device.update({
      where: { id: device.id },
      data: {
        borrowedBy: reservation.borrower,
        borrowedSince: new Date(),
        borrowUntil: reservation.toDate,
        borrowReason: reservation.reason,
        borrowDescription: reservation.description,
      },
    })
    await tx.reservation.delete({ where: { id: reservation.id } })
    return d
  })

  await audit({
    operator: getOperator(req), action: '推送預約', deviceId: device.id, deviceName: device.name,
    detail: [
      `借用人：${reservation.borrower}（至 ${fmtDate(reservation.toDate.toISOString())}）`,
      device.borrowedBy && `原借用人 ${device.borrowedBy} 已存入借用紀錄`,
    ].filter(Boolean).join('\n'),
  })
  return NextResponse.json(updated)
}
