import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'
import { fmtDate } from '@/lib/format'

export async function POST(request: NextRequest) {
  const data = await request.json()
  const device = await prisma.device.findUnique({ where: { id: Number(data.deviceId) } })
  if (!device) return NextResponse.json({ error: '設備不存在' }, { status: 404 })

  const borrower = String(data.borrower ?? '').trim()
  const fromDate = new Date(data.fromDate)
  const toDate = new Date(data.toDate)
  if (!borrower) return NextResponse.json({ error: '請填寫借用人' }, { status: 400 })
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return NextResponse.json({ error: '日期格式錯誤' }, { status: 400 })
  if (toDate < fromDate) return NextResponse.json({ error: '結束日期不能早於開始日期' }, { status: 400 })

  // 同一台的預約時段不能重疊；前一位結束當天交接給下一位是常態，不算重疊
  const overlap = await prisma.reservation.findFirst({
    where: { deviceId: device.id, fromDate: { lt: toDate }, toDate: { gt: fromDate } },
  })
  if (overlap) {
    return NextResponse.json({
      error: `與 ${overlap.borrower} 的預約時段重疊（${fmtDate(overlap.fromDate.toISOString())} ~ ${fmtDate(overlap.toDate.toISOString())}）`,
    }, { status: 409 })
  }

  const reservation = await prisma.reservation.create({
    data: {
      deviceId: device.id,
      borrower,
      fromDate,
      toDate,
      reason: data.reason ?? '',
      description: data.description ?? '',
    },
  })
  await audit({ operator: getOperator(request), action: '新增預約', deviceId: device.id, deviceName: device.name,
    detail: `${reservation.borrower}：${fmtDate(reservation.fromDate.toISOString())} ~ ${fmtDate(reservation.toDate.toISOString())}` })
  return NextResponse.json(reservation, { status: 201 })
}
