import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SYSTEM_OPERATOR } from '@/lib/audit'
import { LEGACY_OPERATOR } from '@/lib/legacy-migration'

export const dynamic = 'force-dynamic'

/** 曾經出現過的操作者名字，給選名字時的下拉建議用 */
export async function GET() {
  const rows = await prisma.auditLog.groupBy({
    by: ['operator'],
    _max: { createdAt: true },
    where: { operator: { notIn: ['', '未具名', SYSTEM_OPERATOR, LEGACY_OPERATOR] } },
  })
  rows.sort((a, b) => (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0))
  return NextResponse.json(rows.map(r => r.operator))
}
