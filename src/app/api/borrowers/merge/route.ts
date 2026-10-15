import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { audit, getOperator } from '@/lib/audit'

/** 把多種寫法的借用人名字統一成同一個：目前借用、借用紀錄、預約一起改 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const to = String(body.to ?? '').trim()
  const from: string[] = Array.isArray(body.from)
    ? Array.from(new Set(body.from.map((n: unknown) => String(n)).filter((n: string) => n && n !== to)))
    : []
  if (!to) return NextResponse.json({ error: '請填寫統一後的名字' }, { status: 400 })
  if (!from.length) return NextResponse.json({ error: '請選擇要合併的名字' }, { status: 400 })

  const [devices, history, reservations] = await prisma.$transaction([
    prisma.device.updateMany({ where: { borrowedBy: { in: from } }, data: { borrowedBy: to } }),
    prisma.borrowHistory.updateMany({ where: { borrower: { in: from } }, data: { borrower: to } }),
    prisma.reservation.updateMany({ where: { borrower: { in: from } }, data: { borrower: to } }),
  ])
  const total = devices.count + history.count + reservations.count
  await audit({
    operator: getOperator(req),
    action: '合併借用人',
    detail: `${from.join('、')} → ${to}\n目前借用 ${devices.count} 台、借用紀錄 ${history.count} 筆、預約 ${reservations.count} 筆`,
  })
  return NextResponse.json({ ok: true, total, devices: devices.count, history: history.count, reservations: reservations.count })
}
