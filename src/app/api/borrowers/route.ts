import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * 曾出現過的借用人名字（目前借用、借用紀錄、預約），依出現次數排序。
 * 給輸入框的下拉建議用，減少「Ryan Wu / RYANWU / Ryan Wu - TW (System)」這種同一人多種寫法。
 * `?counts=1` 回傳 [{ name, count }]，給設定頁的借用人整理用。
 */
export async function GET(req: NextRequest) {
  const [devices, history, reservations] = await Promise.all([
    prisma.device.groupBy({ by: ['borrowedBy'], _count: true, where: { borrowedBy: { not: '' } } }),
    prisma.borrowHistory.groupBy({ by: ['borrower'], _count: true }),
    prisma.reservation.groupBy({ by: ['borrower'], _count: true }),
  ])
  const counts = new Map<string, number>()
  const add = (name: string, n: number) => {
    const key = name.trim()
    if (key) counts.set(key, (counts.get(key) ?? 0) + n)
  }
  devices.forEach(r => add(r.borrowedBy, r._count))
  history.forEach(r => add(r.borrower, r._count))
  reservations.forEach(r => add(r.borrower, r._count))
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  if (req.nextUrl.searchParams.get('counts')) {
    return NextResponse.json(sorted.map(([name, count]) => ({ name, count })))
  }
  return NextResponse.json(sorted.map(([n]) => n))
}
